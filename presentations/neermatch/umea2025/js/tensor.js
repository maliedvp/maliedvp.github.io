function draw_tensor(ctx, rows, columns, depths, colors) {
  const sizeX = 8;
  const sizeY = 8;
  const sizeZ = 8;

  for (var row = rows - 1; row >= 0; row--) {
    for (var col = 0; col < columns; col++) {
      for (var depth = depths - 1; depth >= 0; depth--) {
        var x = 50 + col * 8 + depth * 8;
        var y = 50 + row * 8 + col * 4 - depth * 4;
        drawCube(ctx, x, y, sizeX, sizeY, sizeZ, colors[col]);
      }
    }
  }
}

function drawCube(ctx, x, y, wx, wy, h, color) {
  ctx.lineJoin = "round";

  // left face
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - wx, y - wx * 0.5);
  ctx.lineTo(x - wx, y - h - wx * 0.5);
  ctx.lineTo(x, y - h * 1);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.strokeStyle = 'black';
  ctx.stroke();
  ctx.fill();

  // right face
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + wy, y - wy * 0.5);
  ctx.lineTo(x + wy, y - h - wy * 0.5);
  ctx.lineTo(x, y - h * 1);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.strokeStyle = 'black';
  ctx.stroke();
  ctx.fill();

  // center face
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.lineTo(x - wx, y - h - wx * 0.5);
  ctx.lineTo(x - wx + wy, y - h - (wx * 0.5 + wy * 0.5));
  ctx.lineTo(x + wy, y - h - wy * 0.5);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.strokeStyle = 'black';
  ctx.stroke();
  ctx.fill();
}

function drawTransformationArrow(ctx) {
  var startPointX = 5;
  var startPointY = 105;
  var endPointX = 35;
  var endPointY = 100;
  var quadPointX = 15;
  var quadPointY = 120;

  ctx.lineWidth = 1;

  var arrowAngle = Math.atan2(quadPointX - endPointX, quadPointY - endPointY) + Math.PI;
  var arrowWidth = 5;

  ctx.beginPath();
  ctx.moveTo(startPointX, startPointY);

  ctx.quadraticCurveTo(quadPointX, quadPointY, endPointX, endPointY);

  ctx.moveTo(endPointX - (arrowWidth * Math.sin(arrowAngle - Math.PI / 6)),
    endPointY - (arrowWidth * Math.cos(arrowAngle - Math.PI / 6)));

  ctx.lineTo(endPointX, endPointY);

  ctx.lineTo(endPointX - (arrowWidth * Math.sin(arrowAngle + Math.PI / 6)),
    endPointY - (arrowWidth * Math.cos(arrowAngle + Math.PI / 6)));

  ctx.stroke();
  ctx.closePath();

  // Draw the annotation above the arrow
  var annotation = 'C';
  var subscript = 'I';
  var annotationX = startPointX + 5;
  var annotationY = startPointY - 2;

  ctx.font = '10px Arial';
  ctx.fillStyle = 'black';
  ctx.textAlign = 'center';
  ctx.fillText(annotation, annotationX, annotationY);
  ctx.font = '7px Arial';
  ctx.fillStyle = 'black';
  ctx.textAlign = 'center';
  ctx.fillText(subscript, annotationX + 5, annotationY + 1);

}

function drawBracket(ctx, originX, originY, Height, Width, rotation, Text) {
  var x1 = Math.cos(rotation) * (0) - Math.sin(rotation) * (-Height);
  var y1 = Math.sin(rotation) * (0) + Math.cos(rotation) * (-Height);
  var x2 = Math.cos(rotation) * (Width) - Math.sin(rotation) * (-Height);
  var y2 = Math.sin(rotation) * (Width) + Math.cos(rotation) * (-Height);
  var x3 = Math.cos(rotation) * (Width) - Math.sin(rotation) * (0);
  var y3 = Math.sin(rotation) * (Width) + Math.cos(rotation) * (0);
  var x4 = Math.cos(-rotation) * (x2 + originX - 2) - Math.sin(-rotation) * (y2 + originY - 2);
  var y4 = Math.sin(-rotation) * (x2 + originX - 2) + Math.cos(-rotation) * (y2 + originY - 2);

  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.lineTo(x1 + originX, y1 + originY);
  ctx.lineTo(x2 + originX, y2 + originY);
  ctx.lineTo(x3 + originX, y3 + originY);
  ctx.font = '8px Arial';
  ctx.fillStyle = 'black';
  ctx.textAlign = 'right';
  ctx.rotate(rotation);
  ctx.fillText(Text, x4, y4);
  ctx.rotate(-rotation);
  ctx.stroke();
  ctx.closePath();

}


function draw_scene(div_name) {
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext('2d');

  canvas.width = 1200;
  canvas.height = 800;

  document.getElementById(div_name).appendChild(canvas);

  const input_col_colors = ['red', 'red', 'green', 'blue', 'red'];
  const output_col_colors = Array(5).fill('blue');

  requestAnimationFrame(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(4, 4);
    draw_tensor(ctx, 8, 5, 2, input_col_colors);
    ctx.translate(100, 0);
    draw_tensor(ctx, 8, 7, 1, output_col_colors);
    drawTransformationArrow(ctx);
    ctx.translate(-60, 38);
    drawBracket(ctx, 0, 65, 5, 65, Math.PI * 1.5, 'Batch Pairs');
    drawBracket(ctx, 0, 0, 5, 20, -Math.PI / 6, 'Sources');
    drawBracket(ctx, 18, -10, 5, 46, Math.PI * 0.15, 'Fields');
    drawBracket(ctx, 110, -6, 5, 63, Math.PI * 0.15, 'Similarities');
  });
  console.log('done');
}
