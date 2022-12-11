// downsized and simplified version of the collision avoidance dal to demonstrate the model checker 

const FRONT = 0;
const LEFT = 1;
const RIGHT = 2;

const minimum_forward_dist = 0.5;
const minimum_side_dist = 0.4;

ctx.populateContext([
  ctx.Entity("bot1", "robot", { oAhead: 3, oFrontLeft: 3, oFrontRight: 3, oLeft: 3, oRight: 3, oBack: 3, })
]);

ctx.registerQuery("Robot", function (entity) {
  return entity.type == "robot";
});

ctx.registerQuery("ObstacleAhead", function (entity) {
  return entity.type == "robot" && entity.oAhead < minimum_forward_dist;
});

ctx.registerQuery("ObstacleLeft", function (entity) {
  return entity.type == "robot" && entity.oLeft < minimum_side_dist;
});

ctx.registerQuery("ObstacleRight", function (entity) {
  return entity.type == "robot" && entity.oRight < minimum_side_dist; 
});

ctx.registerEffect("ScanData", 
  function (data) {
    function getDistanceToObstacle(range, range_max) {
      return range == null ? range_max : range;
    }

    var ranges = data.ranges;

    ctx.getEntityById("bot1").oAhead = getDistanceToObstacle(ranges[FRONT], data.range_max);
    ctx.getEntityById("bot1").oLeft = getDistanceToObstacle(ranges[LEFT], data.range_max);
    ctx.getEntityById("bot1").oRight = getDistanceToObstacle(ranges[RIGHT], data.range_max);
  })
