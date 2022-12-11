// downsized and simplified version of the collision avoidance bl to demonstrate the model checker 

var scanDataEventSet = bp.EventSet("", function (e) {
  return e.name.equals("ScanData");
});

var scanEventSet = bp.EventSet("", function (e) {
  return e.name.equals("/scan");
});

var updateVelocityEventSet = bp.EventSet("", function (e) {
  return e.name.equals("UpdateVelocity");
});

var forwardEventSet = bp.EventSet("", function (e) {
  return e.name.equals("UpdateVelocity") && e.data.linear.x > 0;
});

var leftEventSet = bp.EventSet("", function (e) {
  return e.name.equals("UpdateVelocity") && e.data.angular.z > 0;
});

var rightEventSet = bp.EventSet("", function (e) {
  return e.name.equals("UpdateVelocity") && e.data.angular.z < 0;
});

var backwardsEventSet = bp.EventSet("", function (e) {
  return e.name.equals("UpdateVelocity") && e.data.linear.x < 0;
});


ctx.bthread("update scan data", "Robot", function (entity) {
  while (true) {
      var e = bp.sync({waitFor: scanEventSet});
      var data = e.data
      var scan_data = {ranges: data.ranges, range_max:data.range_max};
     
      sync({request: Event("ScanData", scan_data)});
      sync({request: Event("ScanCompleted")});
  }
}); 

ctx.bthread("toggle scan and move", "Robot", function (entity) {
  while(true) {
    sync({waitFor: scanDataEventSet, block: updateVelocityEventSet});
    sync({waitFor: updateVelocityEventSet, block: scanDataEventSet});
  }
});

// simulates the scan events
ctx.bthread("sim events", "Robot", function (entity) {
  while (true) {
    // randomly chooses wether an direction is blocked
    // the model checker will systematically go through all possible combinations of the bp.random.nextBoolean() values
    var front_dist = bp.random.nextBoolean() ? 0.1 : 2;
    var left_dist = bp.random.nextBoolean() ? 0.1 : 2;
    var right_dist = bp.random.nextBoolean() ? 0.1 : 2;

    sync({request: Event("/scan", {ranges: [front_dist, left_dist, right_dist], range_max: 3})});
    sync({waitFor: Event("ScanCompleted")});
  }
});

ctx.bthread("move forward", "Robot", function (entity) {
  while (true) {
    sync({request: Event("UpdateVelocity", {"linear": {"x": 0.3}, "angular": {"z": 0}})}, 100);
  }
});

ctx.bthread("turn left", "Robot", function (entity) {
  while(true) {
    sync({request: Event("UpdateVelocity", {"linear": {"x": 0}, "angular": {"z": 1.5}})}, 50);
  }
});

ctx.bthread("turn right", "Robot", function (entity) {
  while(true) {
    sync({request: Event("UpdateVelocity", {"linear": {"x": 0}, "angular": {"z": -1.5}})}, 50);
  }
});


ctx.bthread("avoid walls ahead", "ObstacleAhead", function (entity) {
  sync({block: forwardEventSet}) 
});

ctx.bthread("avoid walls on the left", "ObstacleLeft", function (entity) {
  sync({block: leftEventSet})
});

ctx.bthread("avoid walls on the right", "ObstacleRight", function (entity) {
  sync({block: rightEventSet})
});
