const COLORS = ["#264653", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"];

const POINT_SIZE = "24px";
const INTERVAL = 750;

class Style {
  constructor(style) {
    this.style = style;
  }
}

Style.prototype.toString = function () {
  return Object.keys(this.style)
    .map((k) => `${k}: ${this.style[k]};`)
    .join("");
};

class Tetris {
  constructor(width, height) {
    if (width === undefined || height === undefined) {
      throw new Error("Undefined value for width or height.");
    }

    this.active = undefined;
    this.width = width;
    this.height = height;
    this.matrix = undefined;
    this.interval = undefined;
    this.gameOver = false;

    document.addEventListener("keydown", this.handleKeyDown);
    document.addEventListener("keyup", this.handleKeyUp);
  }

  start = () => {
    this.generateMatrix();
    this.renderMatrix();
    this.gameOver = false;
    this.next();
    this.createInterval();
  };

  next = () => {
    if (this.gameOver) {
      return;
    }

    const piece = randomPiece();

    this.active = {
      piece,
      x: 5,
      y: -1,
    };

    this.renderActive();
    this.moveDown();
  };

  stop = () => {
    this.clearInterval();
    this.active = undefined;
    this.gameOver = true;

    const event = new Event("gameOver");
    document.getElementById("tetris-container").dispatchEvent(event);
  };

  generateMatrix = () =>
    (this.matrix = Array(this.height)
      .fill()
      .map(() => Array(this.width).fill()));

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
    const style = new Style({
      "grid-template-rows": `repeat(${this.height}, ${POINT_SIZE})`,
      "grid-template-columns": `repeat(${this.width}, ${POINT_SIZE})`,
    });

    return `<div class="tetris" id="tetris">
      <div class="background" style="${style}">
        ${this.renderBoxes()}
      </div>
      <div id="matrix" style="${style}"></div>
      <div id="active" style="${style}"></div>
    </div>`;
  }

  renderBoxes() {
    let boxes = "";

    for (let i = 0; i < this.width * this.height; i++) {
      boxes = boxes.concat('<span class="box"></span>');
    }

    return boxes;
  }

  renderMatrix = () => {
    let matrix = "";

    this.matrix.forEach((rows, y) => {
      rows.forEach((col, x) => {
        matrix = matrix.concat(
          `<span style="${new Style({ "background-color": col })}"></span>`
        );
      });
    });

    document.getElementById("matrix").innerHTML = matrix;
  };

  renderActive = () => {
    const { piece, x, y } = this.active;

    const element = piece.render(x, y);

    document.getElementById("active").innerHTML = element;
  };

  createInterval = () => (this.interval = setInterval(this.moveDown, INTERVAL));

  clearInterval = () => {
    clearInterval(this.interval);
    this.interval = undefined;
  };

  moveDown = () => {
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

    active.piece.points.forEach((p) => {
      const x = active.x + p.x;
      const y = active.y + p.y;

      if (this.isValidCoord(x, y)) {
        this.matrix[y][x] = active.piece.color;
      }
    });

    this.active = undefined;
    this.validateMatrix();
    this.renderMatrix();
  };

  validateMatrix = () => {
    if (!this.isRowEmpty(this.matrix[0])) {
      this.stop();
      return alert("Game over!");
    }

    const matrix = this.matrix.filter((row) => !this.isRowFull(row));

    while (matrix.length < this.height) {
      matrix.unshift(Array(this.width).fill());
    }

    this.matrix = matrix;
  };

  rotate = () => {
    this.active.piece.rotate();

    const offsetRight = this.width - (this.active.x + this.active.piece.width);

    if (offsetRight < 0) {
      this.active.x += offsetRight;
    }
  };

  get canMoveLeft() {
    if (
      this.active.piece.points.every((point) => {
        return this.isValidCoord(
          this.active.x + point.x - 1,
          this.active.y + point.y
        );
      })
    ) {
      return true;
    }

    return false;
  }

  get canMoveRight() {
    if (
      this.active.piece.points.every((point) => {
        return this.isValidCoord(
          this.active.x + point.x + 1,
          this.active.y + point.y
        );
      })
    ) {
      return true;
    }

    return false;
  }

  get canMoveDown() {
    if (
      this.active.piece.points.every((point) => {
        return this.isValidCoord(
          this.active.x + point.x,
          this.active.y + point.y + 1
        );
      })
    ) {
      return true;
    }

    return false;
  }

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

class Piece {
  constructor(color, points) {
    if (!points || !points.length) {
      throw new Error("Invalid points array.");
    }

    this.color = color;
    this.points = points;
    this.calculateDimension();
  }

  render = (x, y) => {
    const style = new Style({
      "grid-template-rows": `repeat(${this.height}, ${POINT_SIZE})`,
      "grid-template-columns": `repeat(${this.width}, ${POINT_SIZE})`,
      ...(defined(x, y) ? { "grid-column": x + 1, "grid-row": y + 1 } : {}),
    });

    return `<div class="piece" style="${style}">
      ${this.points.map((p) => p.render(this.color)).join("")}
    </div>`;
  };

  rotate = () => {
    this.points.forEach((p) => {
      const { x, y } = p;
      p.x = y;
      p.y = x;
    });

    this.calculateDimension();

    this.points.forEach((p) => {
      p.x = this.width - 1 - p.x;
    });
  };
}

Piece.prototype.calculateDimension = function () {
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
    // if (!defined(color, this.color)) {
    //   throw new Error("No color defined for point.");
    // }

    const style = new Style({
      "background-color": color || this.color,
      "grid-column": this.x + 1,
      "grid-row": this.y + 1,
    });

    return `<span class="point" style="${style}"></span>`;
  }
}

const p = (x, y) => new Point(x, y);

const createPieces = () => [
  new Piece(COLORS[0], [p(0, 0), p(0, 1), p(1, 0), p(1, 1)]),
  new Piece(COLORS[1], [p(0, 0), p(0, 1), p(0, 2), p(0, 3)]),
  new Piece(COLORS[2], [p(0, 0), p(0, 1), p(1, 1), p(1, 2)]),
  new Piece(COLORS[3], [p(0, 0), p(0, 1), p(0, 2), p(1, 2)]),
  new Piece(COLORS[4], [p(1, 0), p(0, 1), p(1, 1), p(2, 1)]),
];

const randomPiece = () => {
  return pieces[Math.floor(Math.random() * pieces.length)];
};

function defined(...values) {
  return values.every((v) => v !== undefined);
}

const renderPieces = (pieces) => {
  const elements = pieces.map((p) => p.render()).join("");
  document.getElementById("pieces-container").innerHTML = elements;
};

const renderTetris = (tetris) => {
  document.getElementById("tetris-container").innerHTML = tetris.render();
};

const tetris = new Tetris(12, 20);
const pieces = createPieces();
// renderPieces(pieces);
renderTetris(tetris);

const startButton = document.getElementById("start");

document
  .getElementById("tetris-container")
  .addEventListener("gameOver", () => (startButton.disabled = false));

startButton.addEventListener("click", (e) => {
  startButton.disabled = true;
  tetris.start();
});
