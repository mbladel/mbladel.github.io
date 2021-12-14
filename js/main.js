$(function() {
  "use strict";
  // global variables ---------------------------

  let field = []; // global letiable for game field ( matrix )

  const CELL_SIZE = 20;

  const game_types = {
    beginner: { rows: 9, cols: 9, mines: 10 },
    intermediate: { rows: 16, cols: 16, mines: 40 },
    hard: { rows: 16, cols: 30, mines: 99 },
  };

  let board = SVG('gameboard').size('100%', '100%');

  // start default game type (future --> preference in storage?)
  newGame(game_types[$('#container form input[name=difficulty]:checked').val()]);

  // functions ----------------------------------

  function point(x, y) {
    return x + ',' + y;
  }

  function generateMines() {
    let i = 0;
    while (i < window.game.mines) {
      let m = Math.floor(Math.random() * window.game.rows * window.game.cols);
      if (field[m] !== -1) {
        field[m] = -1;
        i++;
      }
    }
  }

  function countMines(index) {
    let row = Math.floor(index / window.game.cols),
      col = index % window.game.cols,
      count = 0;
    // there's probably a better way to do this
    for (let i = -1; i < 2; i++) {
      let maxValue = (row + i + 1) * window.game.cols;
      for (let j = -1; j < 2; j++) {
        if (row + i >= 0 && col + j >= 0) {
          let check = (row + i) * window.game.cols + col + j;
          if (check < maxValue && check < field.length && field[check] === -1)
            count++;
        }
      }
    }

    return count;
  }

  function newGame(game) {
    window.game = game;
    window.game.ended = null;
    window.game.count = 0;
    $('#gameboard svg').html(''); // empties previous gameboard
    // center the gameboard in the window with position: absolute
    $('#container').css({
      marginLeft: '-' + (CELL_SIZE * game.cols + 16) / 2 + 'px',
      marginTop: '-' + (CELL_SIZE * game.rows + 16 + 54) / 2 + 'px',
      height: (CELL_SIZE * game.rows + 16 + 54) + 'px',
      width: (CELL_SIZE * game.cols + 16) + 'px'
    });
    // game frame every time for different size
    drawFrame();
    // reset field and randomly place mines
    field = [];
    generateMines();
    // draw and fill cells
    let cells = board.group().attr({ id: 'cells' });
    for (let i = 0; i < game.rows; i++) {
      for (let j = 0; j < game.cols; j++) {
        let index = i * game.cols + j;
        if (field[index] !== -1)
          field[index] = countMines(index);
        // 9 is the pixel offset left, 61 is top
        let c = drawCell(CELL_SIZE * j + 9, CELL_SIZE * i + 61, index);
        cells.add(c);
      }
    }
    // make board reactive
    setUpListeners();
  }
  // open cell visually
  function openCell(id) {
    let group = $('#' + id);
    group.addClass('opened');
    group.off('mousedown');
    group.find('.white').css('display', 'none');
    let square = $('#' + id).find('.square');
    if (square) {
      let x = parseInt(square.attr('x'), 10),
        y = parseInt(square.attr('y'), 10);
      square.attr({ x: x - 1, y: y - 1, width: 18, height: 18 });
    }
  }
  // utility to draw flag over cell
  function drawFlag(id) {
    let square = $('#' + id + ' .square'),
      x = parseInt(square.attr('x'), 10),
      y = parseInt(square.attr('y'), 10);

    SVG.get('' + id).add(board.image('img/flag.png')
      .attr({ x: x, y: y, width: 16, height: 16, draggable: false, unselectable: 'on' }));
    $('#' + id + ' image').on('dragstart', function() { return false; }); // disable dragging
  }
  // handle game stuff when cell is opened
  function onOpen(id, flag) {
    let number = parseInt(id, 10),
      square = $('#' + id + ' .square'),
      x = parseInt(square.attr('x'), 10),
      y = parseInt(square.attr('y'), 10),
      g = SVG.get(id);

    if (field[number] > 0) { // normal cell, just show number
      window.game.count++;
      g.add(board.text('' + field[number]).attr({ x: x + 5, y: y - 6 }));
      $('#' + id).addClass('cell-' + field[number]);
    } else if (field[number] === 0) { // empty cell, show neighbours recursively
      window.game.count++;
      openNeighbours(number);
    } else { // bomb, you loose
      $('#' + id).empty(); // remove all unnecessary rects
      g.add(board.image('img/bomb.png')
        .attr({ x: x, y: y, width: 18, height: 18, draggable: false, unselectable: 'on' }));
      $('#' + id + ' image').on('dragstart', function() { return false; }); // disable dragging
      $('#button text tspan').text('😵');
      $('#cells g').off(); // stop user input on cells
      if (!flag) {
        field.forEach(function(value, i) { // open all bomb cells
          // TODO show wrong flags (bomb with x)
          if (value === -1 && !$('#' + i).hasClass('opened')) {
            openCell(i);
            onOpen('' + i, true); // flag = true to avoid recursion
          }
        });
      }
      window.game.ended = 'lost';
    }
    // win condition
    if (window.game.count === (window.game.rows * window.game.cols) - window.game.mines) {
      $('#button text tspan').text('😎');
      $('#cells g').off();
      window.game.ended = 'win';
      // put flags on all remaining bombs
      field.forEach(function(value, i) {
        if (value === -1 && !$('#' + i).hasClass('flag')) {
          $('#' + i).find('text').remove(); // remove question mark if present
          drawFlag(i);
        }
      });
    }
    $('#' + id).off('click contextmenu');
  }

  function openNeighbours(index) {
    let row = Math.floor(index / window.game.cols),
      col = index % window.game.cols;

    for (let i = -1; i < 2; i++) {
      let maxValue = (row + i + 1) * window.game.cols;
      for (let j = -1; j < 2; j++) {
        if (row + i >= 0 && col + j >= 0) {
          let check = (row + i) * window.game.cols + col + j;
          if (check < maxValue && check < field.length &&
            !$('#' + check).is('.opened, .flag, .question')) {
            openCell('' + check);
            onOpen('' + check);
          }
        }
      }
    }
  }

  // gameplay listeners -------------------------

  function setUpListeners() {
    $('#gameboard').off(); // turn off all listeners
    // click on cells / button
    $('#gameboard g').click(function(evt) {
      if (evt.currentTarget.id === 'button') {
        // TODO if !window.game.ended ask before starting new game
        newGame(game_types[$('#container form input[name=difficulty]:checked').val()]);
      } else if (!isNaN(evt.currentTarget.id) && !$(evt.currentTarget).hasClass('flag') &&
        !$(evt.currentTarget).hasClass('question')) {
        $(evt.currentTarget).off('mouseleave');
        onOpen(evt.currentTarget.id);
      }
    });
    // right click, flag and question mark
    $('#gameboard g').on('contextmenu', function(evt) {
      let target = evt.currentTarget;
      if (!isNaN(target.id)) {
        let g = SVG.get(target.id),
          square = $('#' + target.id + ' .square'),
          x = parseInt(square.attr('x'), 10),
          y = parseInt(square.attr('y'), 10);
        if ($(target).hasClass('flag')) {
          $(target).find('image').remove();
          g.add(board.text('?').attr({ x: x + 3, y: y - 7, anchor: 'middle', weight: 'bold' }));
          $(target).removeClass('flag').addClass('question');
        } else if ($(target).hasClass('question')) {
          $(target).removeClass('question');
          $(target).find('text').remove();
        } else {
          drawFlag(target.id);
          $(target).addClass('flag');
        }
      }
    });
    // on double click open everything, bombs must be flagged or you lose
    $('#cells g').dblclick(function(evt) {
      // TODO check number of flags on neighbours b4 open
      openNeighbours(parseInt(evt.currentTarget.id, 10));
    });

    function resetCell(cell) {
      // check if cell has been opened and don't reset it
      let opened = false,
        classes = $(cell).attr('class');
      if (classes) {
        classes.split(/\s+/).forEach(function(c) {
          if (c.indexOf('cell-') > -1)
            opened = true;
        });
      }
      if (opened) return;

      $(cell).removeClass('opened');
      $(cell).find('.white').css('display', '');
      let square = $(cell).find('.square');
      let x = parseInt(square.attr('x'), 10),
        y = parseInt(square.attr('y'), 10);
      square.attr({ x: x + 1, y: y + 1, width: 16, height: 16 });
      $(cell).mousedown(mousedown);
    }

    $('#cells g').mousedown(mousedown);

    function mousedown(evt) {
      if (evt.which === 1 && !$(evt.currentTarget).hasClass('flag') &&
        !$(evt.currentTarget).hasClass('question')) {
        openCell(evt.currentTarget.id);
        $(evt.currentTarget).mouseleave(function() {
          $(evt.currentTarget).off('mouseleave');
          setTimeout(function() {
            resetCell(evt.currentTarget);
          }, 50); // set timeout to fix mouseleave before click
        });
      }
    }
    // disable right click menu for game board
    $('#gameboard').on('contextmenu', function() {
      return false;
    });
  }

  // svg drawing functions ----------------------

  function drawCell(x, y, id) {
    let frame_white = board.polygon(point(x, y) + ' ' + point(x, y + CELL_SIZE) + ' ' +
      point(x + CELL_SIZE, y)).attr({ class: 'white', fill: 'white' });
    let frame_black = board.polygon(point(x, y + CELL_SIZE) + ' ' +
      point(x + CELL_SIZE, y + CELL_SIZE) + ' ' + point(x + CELL_SIZE, y)).fill('grey');
    let center = board.rect(16, 16)
      .attr({ x: x + 2, y: y + 2, fill: 'lightgrey', class: 'square' });
    // group element for listeners with id = index in field array
    let g = board.group().attr({ id: id });
    g.add(frame_white);
    g.add(frame_black);
    g.add(center);
    return g;
  }
  // this is ugly, but I guess there's no other way
  function drawFrame() {
    let total_width = CELL_SIZE * window.game.cols,
      total_height = CELL_SIZE * window.game.rows;
    // white border left and up, 2
    board.rect(total_width + 16, total_height + 68).attr({ fill: 'white' });
    // grey frame, 5
    board.rect(total_width + 14, total_height + 66).attr({ x: 2, y: 2, fill: 'lightgrey' });
    // internal grey border 2
    board.rect(total_width + 4, total_height + 56).attr({ x: 7, y: 7, fill: 'grey' });
    // grid's bottom and right (in order) white borders
    board.polygon(point(7, total_height + 63) + ' ' +
      point(total_width + 11, total_height + 63) + ' ' +
      point(total_width + 11, total_height + 61) + ' ' +
      point(9, total_height + 61)).fill('white');
    board.polygon(point(total_width + 11, 59) + ' ' +
      point(total_width + 11, total_height + 63) + ' ' +
      point(total_width + 9, total_height + 63) + ' ' +
      point(total_width + 9, 61)).fill('white');
    // line over cells
    board.rect(total_width + 10, 5).attr({ x: 2, y: 54, fill: 'lightgrey' });
    // white border for top part, the second and third triangles are equilateral to make the cut 45°
    board.polygon(point(7, 54) + ' ' + point(total_width + 11, 54) + ' ' +
      point(total_width + 11, 9)).fill('white');
    board.polygon(point(7, 54) + ' ' + point(52, 54) + ' ' + point(52, 9)).fill('white');
    board.polygon(point(total_width + 11 - 47, 54) + ' ' +
      point(total_width + 11, 54) + ' ' +
      point(total_width + 11, 7)).fill('white');
    // top part background
    board.rect(total_width, 43).attr({ x: 9, y: 9, fill: 'lightgrey' });

    // TODO the 2 counters for time and remaining mines (or not)

    // center simley square
    let center = Math.floor((total_width + 9 + 7) / 2),
      button = board.group().attr({ id: 'button' }),
      b1 = board.rect(32, 32).attr({ x: center - 16, y: 15, fill: 'grey' }),
      b2 = board.polygon(point(center - 16, 46) + ' ' + point(center - 16, 15) + ' ' +
        point(center + 16, 15)).attr({ class: 'white', fill: 'white' }),
      b3 = board.rect(28, 28).attr({ x: center - 14, y: 17, fill: 'lightgrey', class: 'square' }),
      b4 = board.text('🙂').attr({ x: center - 13.5, y: 17 });
    button.add(b1).add(b2).add(b3).add(b4);

    function resetButton(evt) {
      let text = $(evt.currentTarget).find('text tspan');
      if (window.game.ended) {
        text.text(window.game.ended === 'lost' ? '😵' : '😎');
      } else {
        text.text('🙂');
      }
      $(evt.currentTarget).find('.white').css('display', '');
      $(evt.currentTarget).find('.square').attr({ x: center - 14, y: 17, height: 27, width: 27 });

      $(evt.currentTarget).off('mouseup mouseleave');
    }

    $('#button').mousedown(function(evt) {
      if (evt.which === 1) { // left click
        $(evt.currentTarget).find('text tspan').text('😯');
        $(evt.currentTarget).find('.white').css('display', 'none');
        $(evt.currentTarget).find('.square').attr({ x: center - 15, y: 16, height: 30, width: 30 });

        $(evt.currentTarget).on('mouseup mouseleave', resetButton);
      }
    });
  }
});
