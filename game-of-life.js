// ---
// layout: post
// title: Conway's Game of Life and D3.js
// ---
// I am fascinated by [Conway's Game of Life](http://en.wikipedia.org/wiki/Conway%27s_Game_of_Life).
// Click **start**, and behold:
// {% include game-of-life.html %}

// The growth appears organic. Patterns emerge from initial messy states,
// sometimes stabilize, and then sometimes fall back into disorder.

// The things is, though, it's all very orderly and simple. That's what I
// find most fascinating---that all this is the product of a set of simple
// rules, applied over and over.

// ## The Rules of the Game
// The game consists in creating successive generations of a cell population.
// Each cell is either alive or dead. With each "turn"
// in the game, we create the next generation of cells, replacing the old one.
// We decide which cells are alive in the next generation according
// to the following rules:

// 1. Each cell has eight neighbors: top, bottom, left, right, and on each diagonal.
// 1. A living cell continues to live if and only if it has exactly two or exactly three living neighbors.
// Any more and it dies of overcrowding. Any fewer and it dies of loneliness.
// 1. A dead cell comes alive if it has exactly three living neighbors.

// That's it. We start with a seed set of cells and just apply the rules to each
// generation in order to create the next generation.

// Or rather, that's not *quite* it. There's still plenty to figure out as we implement
// our game. This post explores an implemention of Conway's Game of
// Life. In fact, inspired by [Docco](http://jashkenas.github.io/docco/), this
// post __*is*__ an implementation of Conway's Game of Life. Let's get started.

// ## How to Store a Cell Population
// We start by deciding how to represent our cells, both individually and as a population. If we
// structure our data right, writing the rest of the program is easy.

// Let's consider how the rest of the program interacts with our cell population so
// we can figure out what abilities we need to give our cell population. There are three
// main areas we'll need to consider:

// 1. displaying the current generation of cells
// 1. calculating the next generation of cells
// 1. allowing the user to toggle cells by clicking

// The first two are the most important. Both are performed with every generation
// and both touch at least every living cell. Allowing the user to toggle
// is less important. We need to do it, but shouldn't optimize how we store the cells for
// that case since it happens much less than once per generation and only affects the
// toggled cell.
//
// Let's start with displaying cells. We'll use D3. Why? For one, I promised we
// would in the title of this post. If that isn't a good enough reason (and it isn't!),
// D3 is great at displaying data. It's what it was built to do. We give D3
// data and some instructions on how we want it to display and D3 just does it.
// If we structure our cells as data we can hand to D3, this setup works beautifully.

// For calculating the next generation, we need the following from our cell population:

// - Access to all the cells that *might* be alive in the next generation. This includes both
// the cells that are currently alive and their dead neighbors.
// - Access to a given cell's neighbors.
// - A way to tell whether a given cell is currently alive.

// So, considering the above, how should we structure our data?
// We don't need anything complicated. Given that each cell is defined by its location,
// let's represent each cell as an [x, y] tuple. A population of cells is a
// collection of such tuples. We stipulate that a population contains only living cells.
// Therefore, if a cell is in the population, it is alive; otherwise it is dead.

// This works well with D3 since each tuple is a datapoint---just what D3 was designed
// to display. It also works well with gathering living cells (just the set of tuples),
// calculating neighbors (a bit of arithmetic on x and y), and checking whether a given
// cell is alive.

// ### An alternative structure considered
// Are there other ways we could structure this data? Definitely.
//
// For example, we
// could use a two-dimensional array representing a grid, with each location on
// the grid corresponding to a cell, with a 0 or 1, true or false,
// 'alive' or 'dead', or some other pair of values to indicate whether a cell is alive or dead.
// Most other implementations of the Game of Life take this approach.
//
// This is a
// less natural fit for D3. Indeed, implementations that take this approach typically
// convert the population to a flat array of cells before handing it to D3 to display.
//
// It also imposes firm boundaries on the board. This can be a pro or a con. It is a pro
// in that it limits how large the cell population can grow (i.e. how much memory it can consume)
// to the size of the board.
//
// It's a con in that it will make it hard to add features like zooming or panning
// (which I don't cover in this post but want to add down the road). In going with
// the cell population as a collection of tuples, we make it easier to integrate
// with D3, preserve panning and zooming for later, and just need to implement a
// bounds check when creating new generations, pruning cells that are out of bounds.

// ### Code Time!
// OK, time for some code, right? Let's make this population we've been talking about so much.
// We create our cell population with a simple factory function. Given a seed array of cells,
// it produces an object that does all of the above things for us.
function makePopulation (seed) {
  var liveCells = seed.slice(); // so we don't have to worry about having seed mutated on us

  var alive = {};
  liveCells.forEach(function (cell, ix) {
    alive[cell] = ix;  // store ix so we can easily splice the cell from seed in toggleCell
  });

  return {
    liveCells: getLiveCells,
    isAlive: isAlive,
    getNeighbors: getNeighbors,
    liveCellsAndNeighbors: liveCellsAndNeighbors,
    toggleCell: toggleCell
  };

  // Above we return an object that serves as the interface to our population. Below,
  // we implement that interface, starting with a couple simple functions to return
  // the living cells and to test whether a given cell is alive.
  // (You might recognize this pattern of putting implementation details "below the fold"
  // from the [John Papa Angular Style Guide](https://github.com/johnpapa/angular-styleguide#style-y053).)
  function getLiveCells () {
    return liveCells;
  }

  function isAlive (cell) {
    return alive[cell] !== undefined; // alive[cell] could be zero
  }

  // To get a cell's neighbors, we just return those cells coordinates that
  // are offsets of -1, 0, and 1 on x and y.
  function getNeighbors (cell) {
    var x = cell[0], y = cell[1];
    return [
      [x - 1, y + 1], [x, y + 1], [x + 1, y + 1],
      [x - 1, y    ],             [x + 1, y    ],
      [x - 1, y - 1], [x, y - 1], [x + 1, y - 1]
    ];
  }

  // While getting the living cells is simple, getting their dead neighbors and ensuring there
  // are no duplicates in the returned array takes a little more work.
  function liveCellsAndNeighbors () {
    var dormant = {}; // 'dormant' instead of 'dead' because it sounds more pleasant for the cells :)
    liveCells.forEach(function (cell) {
      getNeighbors(cell)
        .filter(function (neighbor) {
          return !isAlive(neighbor);
        })
        .forEach(function (neighbor) {
          dormant[neighbor] = neighbor;
        });
    });

    var liveCellsAndNeighbors = liveCells.slice(); // add live cells
    for (var cell in dormant) {                    // add dormant cells
      liveCellsAndNeighbors.push(dormant[cell]);
    }
    return liveCellsAndNeighbors;
  }

  // To toggle a cell we just update both the alive index and the liveCells array.
  function toggleCell (cell) {
    if (isAlive(cell)) {
      var ix = alive[cell];
      delete alive[cell];
      liveCells.splice(ix, 1);
    } else {
      alive[cell] = liveCells.length;
      liveCells.push(cell);
    }
  }
}

// ## Displaying a Cell Population
// D3 does all the hard stuff for displaying cells. All we're doing here is feeding D3 an
// array of cells and asking it to match each cell to a circle
// already drawn on the screen (circles left over from the previous generation),
// matching cells to circles based on the cell coordinates. If a cell does not have
// an existing circle, we create one for it (`cells.enter()`...) and position the
// circle according to the cell's coordinates. If
// a circle does not have a cell in this generation we remove it (`cells.exit()`...).
// Otherwise, we leave existing cell/circle matches alone.
function displayCells (cells, settings) {
  var size = settings.cellSize;
  var cells = settings.worldSVG
    .selectAll('circle')
    .data(cells, function (d) { return d; })

  cells.enter()
    .append('circle')
    .attr('class', 'cell')
    .attr('r', size / 2 + 'px')
    .attr('cx', function (d) { return settings.scale(d[0]) + 'px'; })
    .attr('cy', function (d) { return settings.scale(d[1]) + 'px'; })
    .style('fill', '#45e')

  cells.exit()
    .remove();
}

// ## Creating New Generations
// Now that we've fleshed out how to store our cell population and how to display it, let's look at how
// to calculate each new generation. The tools we built into our cell population
// help a lot. We just filter the list returned by `population.liveCellsAndNeighbors`
// through the rules laid out at the beginning of the post. This gives us an array of cells
// that are alive in the next generation and we return a population made using those cells as a seed.
//
// We also filter out cells that are too far off the visible board. Some formations
// (e.g. the Gosper Gun) will expand forever if you let them. While it's OK if cells
// move off the visible space of the board, and is even kind of nice since it'll
// allow us to zoom later (for a later iteration), we don't want the cells expanding forever
// and taking up a bunch of space in memory (all of it, eventually).
function createNewGeneration (population, bounds) {
  var newSeed = population.liveCellsAndNeighbors()
                          .filter(inBounds)
                          .filter(aliveInNextGeneration);

  return makePopulation(newSeed);

  function aliveInNextGeneration (cell) {
    var livingNeighbors = livingNeighborCount(cell);
    return population.isAlive(cell)
           ? livingNeighbors === 2 || livingNeighbors === 3
           : livingNeighbors === 3;
  }

  function livingNeighborCount (cell) {
    return population.getNeighbors(cell)
      .filter(population.isAlive)
      .length;
  }

  function inBounds (cell) {
    var x = cell[0];
    var y = cell[1];
    return x >= 0 - bounds[0] && x <= bounds[0] * 2 &&
           y >= 0 - bounds[1] && y <= bounds[1] * 2;
  }
}

// We've got code to store a cell population, display it, and create
// the next generation. It's time to pull these components together into a cycle of
// showing the current population and creating the next.
function wheelOfTime (population, settings) {
  var bounds = [settings.cellsPerRow, settings.cellsPerRow]; // square board for now
  population = settings.population = createNewGeneration(population, bounds); // save to settings.population so click handlers can access the current population
  var cells = population.liveCells();

  if (!cells.length) clearInterval(settings.interval);
  displayCells(cells, settings); // display even if there are no cells so that the board clears
}

// ## Building the Board
// We're almost there! We've defined our game. Now we just need to set up the board on which
// it plays out, give our users ways to interact with it, and implement a way to bootstrap it.

// We use D3 to insert our gameboard (an svg) into a (supplied) containing DOM element
// and add buttons for the user to interact with the game.
function buildGameDom (container, settings) {
  container = d3.select(container);

  // Now that we know what size our world is, we save off some info on how
  // to scale the elements in our world so everything fits nice and tidy.
  settings.worldSize = container.node().clientWidth || 500;
  settings.cellSize = settings.worldSize / settings.cellsPerRow;
  settings.scale = d3.scale.linear()
    .domain([0, settings.cellsPerRow])
    .range([settings.cellSize / 2, settings.worldSize + settings.cellSize / 2]) // cellSize / 2 so the whole cell is visible (just the center is otherwise)

  // And add buttons to control our game, to do things like kick it off...
  container.append('button')
    .attr('class', 'start')
    .text('Start')
    .on('click', startStop)

  // ...or select a pre-defined formation for the seed population.
  container.selectAll('button.formation')
    .data(Object.keys(settings.formations))
    .enter()
    .append('button')
    .attr('class', 'formation')
    .text(function (d) { return d; })
    .on('click', setFormation);

  // Now we get our board in place.
  settings.worldSVG = container.append('svg')
    .attr('width', settings.worldSize + 'px')
    .attr('height', settings.worldSize + 'px')
    .on('click', toggleCell);

  setFormation('Acorn'); // default in Acorn

  // We run this function when the board is clicked (see above). All it does is figure out
  // which cell was clicked and toggles it in our population.
  function toggleCell (e) {
    var xy = d3.mouse(this);
    var cell = [scaleDown(xy[0]), scaleDown(xy[1])];
    settings.population.toggleCell(cell);
    displayCells(settings.population.liveCells(), settings);

    function scaleDown (n) {
      return Math.floor(n / settings.cellSize);
    }
  }

  // Setting a formation means we grab the seed cells from `settings.formation` and
  // shift the cells to center them on the board.
  function setFormation (d) {
    var formation = settings.formations[d];
    var maxKey = function (arr, key) {
      return arr.reduce(function (max, elem) {
        return max > elem[key] ? max : elem[key];
      }, 0);
    };
    var middle = settings.cellsPerRow / 2;
    var xOffset = Math.floor(middle - maxKey(formation, 0) / 2);
    var yOffset = Math.floor(middle - maxKey(formation, 1) / 2);

    var centeredCells = formation.map(function (cell) {
      return [ cell[0] + xOffset,
               cell[1] + yOffset ];
    });

    settings.population = makePopulation(centeredCells);
    displayCells(settings.population.liveCells(), settings);
  }

  // To start and stop, we just set or clear an interval that calls `wheelOfTime`
  function startStop () {
    settings.stopped = !settings.stopped;

    if (!settings.stopped) {
      settings.interval = setInterval(function () {
        wheelOfTime(settings.population, settings);
      }, settings.tick);

    } else {
      clearInterval(settings.interval);
    }

    d3.select('button.start').text(function () {
      return settings.stopped ? 'Start' : 'Stop';
    });
  }
}

// And finally, we wrap it all up by getting some settings in place---the ones we can figure out
// ahead of time---and giving a way to kick off the game: `game.init(<containing DOM elem>)`.
var game = (function () {
  var settings = {
    cellsPerRow: 75,
    tick: 64,
    stopped: true
  };

  settings.formations = {
    'Acorn' : [[0, 2], [1, 2], [1, 0], [3, 1], [4, 2], [5, 2], [6, 2]],
    'R-pentomino': [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]],
    'Diehard': [[6, 0],
                [0, 1], [1, 1],
                [1, 2], [5, 2], [6, 2], [7, 2]],
    'Glider Gun': [[24, 0],
                  [22, 1], [24, 1],
                  [12, 2], [13, 2], [20, 2], [21, 2], [34, 2], [35, 2],
                  [11, 3], [15, 3], [20, 3], [21, 3], [34, 3], [35, 3],
                  [0, 4], [1, 4], [10, 4], [16, 4], [20, 4], [21, 4],
                  [0, 5], [1, 5], [10, 5], [14, 5], [16, 5], [17, 5], [22, 5], [24, 5],
                  [10, 6], [16, 6], [24, 6],
                  [11, 7], [15, 7],
                  [12, 8], [13, 8]]
  };

  return {
    init: function (container) {
      buildGameDom(container, settings);
    },
  };
})();

// That's it! Thanks for following along, folks!
