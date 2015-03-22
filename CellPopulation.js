/* Store cells as keys in an obj. We can look up neighbors
 * by just looking at the eight surrounding cells.
 * - takes list of [x, y] tuples as a seed
 * - addCell adds a cell to the population (i.e. gives it life)
 * - remove cell pulls a cell from the population (i.e. kills it)
 * - getNeighbors returns neighbor cells, whether dead or alive
 * - cellInPopulation returns true if cell is alive, false otherwise
 */
var CellPopulation = function (seed) {
  var population = {};
  var alive = {};
  var dead = {};

  var addCellToPopulation = function (cell, isAlive) {
    if (isAlive) {
      alive[cell] = cell;
    } else {
      dead[cell] = cell;
    }
  };

  var objToArray = function (obj) {
    var arr = [];
    for (var k in obj) {
      arr.push(obj[k]);
    }
    return arr;    
  };

  population.getNeighbors = function (cell) {
    var offsets = [
      [-1, -1], [0, -1], [1, -1],
      [-1,  0],          [1,  0],
      [-1,  1], [0,  1], [1,  1]
    ];
    return offsets.map(function(offset) {
      return [cell[0] + offset[0], cell[1] + offset[1]];
    });
  };
  
  population.isAlive = function (cell) { return !!alive[cell]; };
  population.addCell = function (cell) { 
    addCellToPopulation(cell, true);
    dead[cell] && delete dead[cell];
  }
  population.liveCells = function () { return objToArray(alive); };
  population.deadCells = function () { return objToArray(dead); };
  population.liveCellsAndNeighbors = function () {
    return population.liveCells().concat(population.deadCells());
  };

  //add cells to population
  seed.forEach(function (cell) {
    addCellToPopulation(cell, true); 
  });

  //track dormant neighbors, too
  seed.forEach(function (cell) {
    population.getNeighbors(cell).filter(function (cell) { 
      return !population.isAlive(cell); //don't overwrite live cells
    }).forEach(function(cell) {
      addCellToPopulation(cell, false);
    });
  });

  return population;
};