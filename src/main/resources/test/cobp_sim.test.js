/* This file contains tests for the application. 
Since the test should be applicable to the application without modifying it, 
the scan and odom events have to be simulated. 
The tests themselves are realized by B-Threads that use assertions to detect errors.
If an assertion fails, a event listener will be notified and cause the test in the 
host application to fail.
*/

var setTargetEventSet = bp.EventSet("", function (e) {
  return e.name.equals("SetTarget");
});

var targetReachedEventSet = bp.EventSet("", function (e) {
  return e.name.equals("TargetReached");
});

// test deliveries to be performed
var deliveryTestData = [
  {source: {x_coor: 2.0, y_coor: 0.5}, goal: {x_coor: -2.0, y_coor: 0.0}},
  {source: {x_coor: 0.0, y_coor: -2.0}, goal: {x_coor: -2.0, y_coor: 0.0}},
  {source: {x_coor: -0.5, y_coor: 2.0}, goal: {x_coor: -2.0, y_coor: 0.0}},
  {source: {x_coor: 0.0, y_coor: 0.0}, goal: {x_coor: 0.0, y_coor: 0.0}},
]

bthread("init testing", function () {
  // replaces the delivery queue with the test data
  ctx.getEntityById("deliveryQueue1").queueList = deliveryTestData.slice(0);
  
  /* When there are no more other events that are requested, this event will be selected. 
  The negative priority value of -100 ensures that it will only be selected when there are no other events available.
  Afterward the test is supposed to end. This event is used to check if certain actions were not performed 
  after the test has ended.  
  */
  sync({request: Event("Test wind up")}, -100);
})

// simulates the /scan messages by continuously submitting scan data with no obstacles
bthread("sim scan", function () {
  const ScanSimData = {
    range_max: 3, 
    ranges: Array(360).fill(3)
  }

  while(true) {
    sync({request: Event("/scan", JSON.stringify(ScanSimData))});
    sync({waitFor: scanDataEventSet});
  }
});

// simulates the /odom messages and movement by setting the coordinates of the robot to the current target
bthread("sim odom", function () {
  var OdomSimData = {
    pose: {pose: {
      position: {x: 0, y: 0}, 
      orientation: {w: 0, x: 0, y: 0, z: 0}
    }} 
  };
 
  while(true) {
    sync({request: Event("/odom", JSON.stringify(OdomSimData))});
    sync({waitFor: positionEventSet});
    
    var targets = ctx.runQuery("Target")
    /* Assert statements are used to detect errors and violations. 
    If the first argument evaluates to false, the assertion fails. This is detected by an event listener which
    causes the unit test to fail. The second argument is a message that describes what went wrong and in which 
    B-Thread it was detected. 
    */
    bp.ASSERT(targets.length <= 1, "There should only be one active target entity at a time, but there were " + targets.length + ". In \"" + bp.thread.name + "\" B-Thread.") 
    if(targets.length > 0) {
      var newPos = {x: targets[0].tar_x_coor, y: targets[0].tar_y_coor};
      OdomSimData.pose.pose.position = newPos;
    }
  }
});
 
// checks wether the the reached target was actually the last requested one
bthread("test correct target reached", function () {
  var requestedTargets = [];
  
  /* Waits for target set and target reached events. It also waits for the "Test wind up"-event 
  which means that the test has ended. If there are still unreached targets at that point, the test fails. 
  */
  while(true) {
    var e = sync({waitFor: setTargetEventSet.or(targetReachedEventSet).or(Event("Test wind up"))});
    if(setTargetEventSet.contains(e)){
      requestedTargets.push(e.data.id); 
    }
    if(targetReachedEventSet.contains(e)){
      bp.ASSERT(requestedTargets.length != 0, "A target was reached but there was no requested Target. Reached target: " + e.data + ". In \"" + bp.thread.name + "\" B-Thread.")
      var lastRequestedTarget = requestedTargets.pop()
      bp.ASSERT(e.data == lastRequestedTarget, "The reached target was not the last requested one. Last target: " + lastRequestedTarget + " reached target: " + e.data + ". In \"" + bp.thread.name + "\" B-Thread.")
    }
    // since Events are technically event sets, the contains method can be used on them (works like an equals)
    if(Event("Test wind up").contains(e)){
      bp.ASSERT(requestedTargets.length == 0, "Test ended but there are still targets that were not reached. In \"" + bp.thread.name + "\" B-Thread.")
    }
  }
}); 

// checks wether all deliveries were properly performed in the right order
bthread("test all deliveries completed", function () {
  for (var i = 0; i < deliveryTestData.length; i++){
    var source = deliveryTestData[i].source;
    var goal = deliveryTestData[i].goal;

    source.id = String(deliveryTestData[i].source.x_coor) + ", " + String(deliveryTestData[i].source.y_coor);
    goal.id = String(deliveryTestData[i].goal.x_coor) + ", " + String(deliveryTestData[i].goal.y_coor);
    
    sync({waitFor: Event("SetTarget", source)});
    sync({waitFor: Event("TargetReached", source.id)});
    sync({waitFor: Event("SetTarget", goal)});
    sync({waitFor: Event("TargetReached", goal.id)});
  }
  sync({request: Event("all Targets reached")}, 1000);
})

// checks wether all deliveries were completed before the test ends
bthread("test all deliveries completed (control)", function () {
  var e = sync({waitFor: Event("all Targets reached").or(Event("Test wind up"))});
  bp.ASSERT(!Event("Test wind up").contains(e), "Test ended but not all deliveries were performed. In \"" + bp.thread.name + "\" B-Thread.")
  sync({waitFor: Event("Test wind up")})
})

