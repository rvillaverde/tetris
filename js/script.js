const COLORS = ["color-1", "color-2", "color-3", "color-4", "color-5"];

const POINT_SIZE = "var(--point-size)";
const INTERVAL = 750;
const SCORE_MULTIPLIER = 10;

const WIDTH = 12;
const HEIGHT = 20;

class CssStyle {
  constructor(style) {
    this.style = style;
  }

  toString = () =>
    Object.keys(this.style)
      .map((k) => `${k}: ${this.style[k]};`)
      .join("");
}

class Point {
  constructor(x, y, color) {
    if (!defined(x, y)) {
      throw new Error("Undefined value for x or y.");
    }

    this.x = x;
    this.y = y;
    this.color = color;
  }

  render(color) {
    const style = new CssStyle({
      "background-color": color || this.color,
      "grid-column": this.x + 1,
      "grid-row": this.y + 1,
    });

    return `<span class="point" style="${style}"></span>`;
  }
}

class Figure {
  constructor(color, points) {
    if (!points || !points.length) {
      throw new Error("Invalid points array.");
    }

    this.color = `var(--${color})`;
    this.points = points;
    this.calculateDimension();
  }

  render = (x, y) => {
    const style = new CssStyle({
      "grid-template-rows": `repeat(${this.height}, ${POINT_SIZE})`,
      "grid-template-columns": `repeat(${this.width}, ${POINT_SIZE})`,
      ...(defined(x, y) ? { "grid-column": x + 1, "grid-row": y + 1 } : {}),
    });

    return `<div class="figure" style="${style}">
      ${this.points.map((p) => p.render(this.color)).join("")}
    </div>`;
  };

  rotate = () => {
    this.transpose();
    this.reflectX();
  };

  transpose = () => {
    this.points.forEach((p) => {
      const { x, y } = p;
      p.x = y;
      p.y = x;
    });

    this.calculateDimension();
  };

  reflectX = () => {
    this.points.forEach((p) => {
      p.x = this.width - 1 - p.x;
    });
  };

  calculateDimension = () => {
    const { height, width } = this.points.reduce(
      (dim, point) => {
        if (point.x > dim.width) {
          dim.width = point.x;
        }

        if (point.y > dim.height) {
          dim.height = point.y;
        }

        return dim;
      },
      { height: 0, width: 0 }
    );

    this.height = height + 1;
    this.width = width + 1;
  };
}

class Matrix {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.matrix = Array(this.height)
      .fill()
      .map(() => Array(this.width).fill());

    this.render();
  }

  add = (points, color) => {
    points.forEach(({ x, y }) => {
      if (this.isValidCoord(x, y)) {
        this.matrix[y][x] = color;
      }
    });

    const result = this.validate();

    if (result) {
      this.render();
    }

    return result;
  };

  validate = () => {
    if (!this.isRowEmpty(this.matrix[0])) {
      return false;
    }

    const matrix = this.matrix.filter((row) => !this.isRowFull(row));
    let rows = 0;

    while (matrix.length < this.height) {
      matrix.unshift(Array(this.width).fill());
      rows++;
    }

    this.matrix = matrix;

    return { rows };
  };

  render = () => {
    let matrix = "";

    this.matrix.forEach((rows) => {
      rows.forEach((col) => {
        matrix = matrix.concat(
          `<span style="${new CssStyle({ "background-color": col })}"></span>`
        );
      });
    });

    document.getElementById("matrix").innerHTML = matrix;
  };

  isRowEmpty = (row) => row.every((c) => !defined(c));

  isRowFull = (row) => row.every((c) => defined(c));

  isValidCoord = (x, y) => {
    if (x < 0 || x >= this.width) {
      return false;
    }

    if (y < 0 || y >= this.height) {
      return false;
    }

    return this.isEmpty(x, y);
  };

  isEmpty = (x, y) => !defined(this.matrix[y][x]);
}

class GameOverScreen {
  constructor(score) {
    this.score = score;
  }

  show = () => this.render();

  render = () => {
    const element = `<div class="game-over" id="game-over">
    <div class="content">
      <h2>Game over!</h2>
      <p>Your score: ${this.score}</div>
    </div>
    </div>`;

    document.getElementById("tetris").innerHTML += element;
  };

  static hide = () => {
    const element = document.getElementById("game-over");
    element && element.remove();
  };
}

class Tetris {
  constructor(width, height) {
    if (!defined(width, height)) {
      throw new Error("Undefined value for width or height.");
    }

    this.active = undefined;
    this.width = width;
    this.height = height;
    this.matrix = undefined;
    this.interval = undefined;
    this.paused = false;
    this.gameOver = false;
  }

  get canRotate() {
    // @TODO: determine if the figure has space to rotate
    return true;
  }

  get canMoveLeft() {
    return this.canMove("left");
  }

  get canMoveRight() {
    return this.canMove("right");
  }

  get canMoveDown() {
    return this.canMove("down");
  }

  canMove = (direction) => {
    const x =
      this.active.x +
      (direction === "left" ? -1 : direction === "right" ? +1 : 0);
    const y = this.active.y + (direction === "down" ? +1 : 0);

    return this.active.figure.points.every((point) =>
      this.matrix.isValidCoord(x + point.x, y + point.y)
    );
  };

  start = () => {
    this.matrix = new Matrix(this.width, this.height);
    this.score = 0;
    this.gameOver = false;
    this.next();
    this.createInterval();

    GameOverScreen.hide();

    document.addEventListener("keydown", this.handleKeyDown);
    document.addEventListener("keyup", this.handleKeyUp);
  };

  pause = () => (this.paused = true);

  resume = () => (this.paused = false);

  next = () => {
    if (this.gameOver) {
      return;
    }

    const figure = randomFigure();

    this.active = {
      figure,
      x: 5,
      y: -1,
    };

    this.moveDown();
  };

  stop = () => {
    this.clearInterval();
    this.active = undefined;
    this.gameOver = true;

    new GameOverScreen(this.score).show();
    const event = new Event("gameOver");

    document.removeEventListener("keydown", this.handleKeyDown);
    document.removeEventListener("keyup", this.handleKeyUp);

    document.getElementById("tetris-container").dispatchEvent(event);
  };

  handleKeyDown = (e) => {
    if (!this.active) {
      return;
    }

    switch (e.code) {
      case "ArrowRight":
        if (this.canMoveRight) {
          this.active.x++;
        }
        break;
      case "ArrowLeft":
        if (this.canMoveLeft) {
          this.active.x--;
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        if (this.interval) {
          this.clearInterval();
        }
        this.moveDown();
        return;
      case "ArrowUp":
        this.rotate();
        e.preventDefault();
        break;
      default:
        return;
    }
    this.renderActive();
  };

  handleKeyUp = (e) => {
    if (!this.active) {
      return;
    }

    switch (e.code) {
      case "ArrowDown":
        this.createInterval();
      default:
        return;
    }
  };

  render() {
    const style = new CssStyle({
      "grid-template-rows": `repeat(${this.height}, ${POINT_SIZE})`,
      "grid-template-columns": `repeat(${this.width}, ${POINT_SIZE})`,
    });

    return `<div class="tetris" id="tetris">
      <div class="background" style="${style}">
        ${this.renderBackground()}
      </div>
      <div id="matrix" style="${style}"></div>
      <div id="active" style="${style}"></div>
    </div>`;
  }

  renderBackground() {
    let grid = "";

    for (let i = 0; i < this.width * this.height; i++) {
      grid = grid.concat('<span class="box"></span>');
    }

    return grid;
  }

  renderActive = () => {
    const { figure, x, y } = this.active;

    const element = figure.render(x, y);

    document.getElementById("active").innerHTML = element;
  };

  createInterval = () => (this.interval = setInterval(this.moveDown, INTERVAL));

  clearInterval = () => {
    clearInterval(this.interval);
    this.interval = undefined;
  };

  moveDown = () => {
    if (this.paused) {
      return;
    }

    if (this.canMoveDown) {
      this.active.y++;
      this.renderActive();
    } else {
      this.addToMatrix();
      this.next();
    }
  };

  addToMatrix = () => {
    const { active } = this;

    const points = active.figure.points.map((p) => ({
      x: active.x + p.x,
      y: active.y + p.y,
    }));

    const result = this.matrix.add(points, active.figure.color);

    if (!result) {
      return this.stop();
    }

    const { rows } = result;

    this.updateScore(rows);

    this.active = undefined;
  };

  validateMatrix = () => {
    const result = this.matrix.validate();

    if (!result) {
      this.stop();
      return alert(`Game over! Your score: ${this.score}`);
    }

    const { rows } = result;

    this.updateScore(rows);
  };

  rotate = () => {
    if (!this.canRotate) {
      return;
    }

    this.active.figure.rotate();

    const offsetRight = this.width - (this.active.x + this.active.figure.width);

    if (offsetRight < 0) {
      this.active.x += offsetRight;
    }
  };

  updateScore = (rows) => {
    if (rows === 0) {
      return;
    }

    const { score } = this;

    const extra = rows === 4 ? 2 : rows === 3 ? 1 : rows === 2 ? 0.5 : 0;
    this.score += (rows + extra) * SCORE_MULTIPLIER;
  };
}

const p = (x, y) => new Point(x, y);

// @TODO: do not create all figures every time I need only a random one
const createFigures = () => [
  new Figure(COLORS[0], [p(0, 0), p(0, 1), p(1, 0), p(1, 1)]),
  new Figure(COLORS[1], [p(0, 0), p(0, 1), p(0, 2), p(0, 3)]),
  new Figure(COLORS[2], [p(0, 0), p(0, 1), p(1, 1), p(1, 2)]),
  new Figure(COLORS[3], [p(0, 0), p(0, 1), p(0, 2), p(1, 2)]),
  new Figure(COLORS[4], [p(1, 0), p(0, 1), p(1, 1), p(2, 1)]),
];

const randomFigure = () => {
  const figures = createFigures();
  return figures[Math.floor(Math.random() * figures.length)];
};

const defined = (...values) => values.every((v) => v !== undefined);

const renderTetris = (tetris) => {
  document.getElementById("tetris-container").innerHTML = tetris.render();
};

const tetris = new Tetris(WIDTH, HEIGHT);
renderTetris(tetris);

const startButton = document.getElementById("start");

startButton.addEventListener("click", () => {
  startButton.disabled = true;
  tetris.start();
});

document
  .getElementById("tetris-container")
  .addEventListener("gameOver", () => (startButton.disabled = false));

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    tetris.pause();
  } else {
    tetris.resume();
  }
});
