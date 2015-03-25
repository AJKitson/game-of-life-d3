// One problem in the Game of Life is how to store a population 
// of cells. With each generations you need to figure out which 
// cells in the current population die off, continue to live, or
// come alive. You need to consider the living cells in the current
// generation, as well as the dead neighbors, which might come
// alive in the next generation.
//
// This means there are three main things a population needs to 
// do well: 
// - serve up all the cells to consider for the next generation
// - find a cell's neighbors
// - determine whether a given cell is alive or dead
// 
// We implement our cell population to take a seed of cells, which
// are just [x, y] tuples, and add the above abilities to that
// seed. We also allow you to add or remove cells after creating 
// the population

var CellPopulation = function (seed) {
  var population = {};

  // The living cells are just the seed. 
  population.liveCells = function () { return seed; };

  // We need an easy way to tell if a given cell is alive,
  // so we create an index of living cells.
  var alive = {};
  seed.forEach(function(cell, ix) {
    // Save the cell's seed array index, so we can easily splice the cell
    // from our population if needed. (see toggleCell below)
    alive[cell] = ix; 
  });
  population.isAlive = function (cell) {
    return alive[cell] !== undefined; // check against undefined since alive[cell] could be zero.
  };

  // A cell lives or dies in the next generation depending on how
  // many of its neighboring cells are alive or dead. So we need
  // a way to get a cell's neighbors. The neighbors are just those
  // cells with coordinates that are offsets of -1, 0, and 1 on x and y.
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

  // Because with each new generation, there's a the possiblity that
  // dead cells will become alive if enough of their neighbors are 
  // alive, we need a way to access all cells, both living and dead.
  // It might seem wastefule to calculate this on the fly in this 
  // method, but it's only called once per generation, whereas 
  // actions that would cause the neighbors to change (adding or 
  // removing cells) could be called multiple times per generation,
  // so better to just calculate them the one time they're needed.
  population.liveCellsAndNeighbors = function () {

    // We start out by creating an index the dormant cells
    // that are neighbors to living cells.
    var dormant = {};
    seed.forEach(function (cell) {
      // get each seed cell's neighbors
      population.getNeighbors(cell)
        // but only neighbors that are not alive
        .filter(function (neighbor) {
          return !population.isAlive(neighbor);
        })
        // and add to dormant index (using an obj to avoid duplicates)
        .forEach(function (neighbor) {
          dormant[neighbor] = neighbor; // In the alive index, we set the value to the cell's index in seed, but we don't have that option here, so this will have to do
        });
    });

    // Now we combine the alive and dormant cells to get all cells that
    // could be alive in the next generation. Start by adding living cells
    var liveCellsAndNeighbors = seed.slice();
    // Now add dormant cells
    for (var cell in dormant) {
      liveCellsAndNeighbors.push(dormant[cell]);
    }

    return liveCellsAndNeighbors;
  };

  // After we create the population from the seed, you might want to 
  // add or remove cells, so we expose a toggle function that'll switch
  // the alive/dead state of a given cell.
  population.toggleCell = function (cell) {
    // remove if alive
    if (population.isAlive(cell)) {
      var ix = alive[cell];
      delete alive[cell];
      seed.splice(ix, 1);

    // add if not alive
    } else {
      alive[cell] = seed.length;
      seed.push(cell);
    }
  };

  return population;
};