// implements a busy waiting sleep function to allow for delays during execution
function sleep(ms){
  var endTime = bp.getTime() + ms;
  while(bp.getTime()<endTime){
    //busy waiting
  }
}

// adds small delay after a target is set
bthread("add delay before reaching target", function () {
  while(true){    
    sync({waitFor: setTargetEventSet});
    sleep(200);
  }
});

// test if the externally added delivery order is performed
bthread("test add delivery", function () {
  // blocks the test from ending before the delivery was added because external events have the lowest priority
  var e = bp.sync({waitFor: addDeliveryEventSet, block:Event("Test wind up")});
  
  bp.setWaitForExternalEvents(false);
  
  var del_coors = JSON.parse(e.data).poses;
  var source = String(del_coors[0].position.x) + ", " + String(del_coors[0].position.y);
  var goal = String(del_coors[1].position.x) + ", " + String(del_coors[1].position.y);

  var e = sync({waitFor: Event("TargetReached", source).or(Event("Test wind up"))});
  bp.ASSERT(!Event("Test wind up").contains(e), "Test ended but the start of the added delivery was never reached. In \"" + bp.thread.name + "\" B-Thread.")

  var e = sync({waitFor: Event("TargetReached", goal).or(Event("Test wind up"))});
  bp.ASSERT(!Event("Test wind up").contains(e), "Test ended but the goal of the added delivery was never reached. In \"" + bp.thread.name + "\" B-Thread.")

});