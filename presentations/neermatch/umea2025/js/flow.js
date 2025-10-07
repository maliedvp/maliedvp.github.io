function createLayerBox(svg, title, x, y, width = 100, height = 50, backgroundColor = "white") {
  let rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("id", `layer-box-${title}`);
  rect.setAttribute("x", x);
  rect.setAttribute("y", y);
  rect.setAttribute("width", width);
  rect.setAttribute("height", height);
  rect.setAttribute("rx", 10);
  rect.setAttribute("ry", 10);
  rect.setAttribute("fill", backgroundColor);
  rect.setAttribute("stroke", "black");
  rect.setAttribute("stroke-width", "2");
  rect.setAttribute("data-auto-animate", "true");
  rect.setAttribute("data-id", `layer-box-${title}`);

  svg.appendChild(rect);

  title.forEach((t, i) => {
    let text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", x + width / 2);
    text.setAttribute("y", y + height / title.length * (i + 0.5));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "central");
    text.setAttribute("font-size", "16");
    text.textContent = t;
    text.setAttribute("data-auto-animate", "true");
    text.setAttribute("data-id", `layer-text-${t}-${i}`);
    svg.appendChild(text);
  });

  return rect;
}

class Layer {
  constructor(svg, title, x, y, width = 100, height = 50, backgroundColor = "white") {
    this.svg = svg;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    if (Array.isArray(title)) {
      this.title = title;
    } else {
      this.title = [title];
    }
    this.el = createLayerBox(svg, this.title, x, y, width, height, backgroundColor);
  }

  render() {
    return this.el;
  }
}

class Input extends Layer {
  constructor(svg, title, x, y, width = 100, height = 50) {
    super(svg, title, x, y, width, height, "none");
    this.el.setAttribute("stroke", "none");
  }
}

class Encoder extends Layer {
  constructor(svg, title, x, y, width = 100, height = 50) {
    super(svg, title, x, y, width, height, "lightblue");
  }
}

class Dense extends Layer {
  constructor(svg, title, x, y, width = 100, height = 50) {
    super(svg, title, x, y, width, height, "pink");
  }
}

class SoftMax extends Layer {
  constructor(svg, title, x, y, width = 100, height = 50) {
    super(svg, title, x, y, width, height, "lightyellow");
  }
}

function connectLayers(svg, layer1, layer2) {
    let x1 = layer1.x + layer1.width;
    let y1 = layer1.y + layer1.height / 2;
    let x2 = layer2.x;
    let y2 = layer2.y + layer2.height / 2;
  if (layer1.x + layer1.width >= layer2.x) {
    let x1 = layer1.x;
    let y1 = layer1.y + layer1.height / 2;
    let x2 = layer2.x + layer2.width;
    let y2 = layer2.y + layer2.height / 2;
  } 

  let dx = -Math.min(-(x2 - x1) * 0.05, -5) / 2;
  let dy = -Math.min(-(y2 - y1) * 0.05, -5) / 2;

  let name_path = `${x1.toFixed(2)}-${y1.toFixed(2)}-${x2.toFixed(2)}-${y2.toFixed(2)}`;
  let path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "black");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("d", `M ${x1} ${y1} L ${x2 - dx} ${y2} L ${x2- dx} ${y2 - dy} L ${x2} ${y2} L ${x2 - dx} ${y2 + dy} L ${x2 - dx} ${y2}`);
  path.setAttribute("data-auto-animate", "true");
  path.setAttribute("data-id", `arrow-path-${name_path}`);

  svg.appendChild(path);
}



function createAnnotatedBox(svg, layers, title, margin = 20) {
  const minX = Math.min(...layers.map(layer => layer.x)) - margin;
  const minY = Math.min(...layers.map(layer => layer.y)) - margin;
  const maxX = Math.max(...layers.map(layer => layer.x + layer.width)) + margin;
  const maxY = Math.max(...layers.map(layer => layer.y + layer.height)) + margin;
  const totalWidth = maxX - minX;
  const totalHeight = maxY - minY;

    const x = minX;
  const y = minY;

  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("x", x);
  rect.setAttribute("y", y);
  rect.setAttribute("width", totalWidth);
  rect.setAttribute("height", totalHeight);
  rect.setAttribute("rx", 10);
  rect.setAttribute("ry", 10);
  rect.setAttribute("fill", "none");
  rect.setAttribute("stroke", "black");
  rect.setAttribute("stroke-width", "2");

  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("x", x + margin);
  text.setAttribute("y", y + margin);
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("dominant-baseline", "central");
  text.setAttribute("font-size", "16");
  text.textContent = title;

  svg.appendChild(rect);
  svg.appendChild(text);

  return rect;
}


function createEllipsis(svg, annotation_text, layer1, layer2) {
  const x1 = layer1.x + layer1.width;
  const y1 = layer1.y + layer1.height / 2;
  const x2 = layer2.x;
  const y2 = layer2.y + layer2.height / 2;

  const x = (x1 + x2) / 2;
  let y = (y1 + y2) / 2;

  const name_path = `${x1.toFixed(2)}-${y1.toFixed(2)}-${x2.toFixed(2)}-${y2.toFixed(2)}`;

  const annotation = document.createElementNS("http://www.w3.org/2000/svg", "text");
  annotation.setAttribute("x", x);
  annotation.setAttribute("y", y - 10);
  annotation.setAttribute("text-anchor", "middle");
  annotation.setAttribute("dominant-baseline", "central");
  annotation.setAttribute("font-size", "18");
  annotation.setAttribute("fill", "black");
  annotation.textContent = annotation_text;
  annotation.setAttribute("data-auto-animate", "true");
  annotation.setAttribute("data-id", `ellipsis-annotation-${name_path}`);

  const ellipsis = document.createElementNS("http://www.w3.org/2000/svg", "text");
  ellipsis.setAttribute("x", x + 8);
  ellipsis.setAttribute("y", y - 4 * annotation_text.length - 10);
  ellipsis.setAttribute("text-anchor", "middle");
  ellipsis.setAttribute("dominant-baseline", "central");
  ellipsis.setAttribute("font-size", "18");
  ellipsis.setAttribute("fill", "black");
  ellipsis.textContent = "...";
  ellipsis.setAttribute("data-auto-animate", "true");
  ellipsis.setAttribute("data-id", `ellipsis-symbol-${name_path}`);
  ellipsis.setAttribute("transform", `rotate(-90, ${x}, ${y})`);

  svg.appendChild(annotation);
  svg.appendChild(ellipsis);

  return ellipsis;
}

function saveSvgAsPng(svgElement, fileName, dpi = 300) {
  return;
  
  const svgXml = new XMLSerializer().serializeToString(svgElement);

  console.log(svgElement.width.baseVal.value);
  const imgWidth = Math.floor(svgElement.width.baseVal.value * dpi / 96);
  const imgHeight = Math.floor(svgElement.height.baseVal.value * dpi / 96);

  const canvas = document.createElement('canvas');
  canvas.width = imgWidth;
  canvas.height = imgHeight;

  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.src = 'data:image/svg+xml;base64,' + btoa(svgXml);

  img.onload = function () {
    ctx.drawImage(img, 0, 0, imgWidth, imgHeight);

    const link = document.createElement('a');
    link.download = fileName + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };
}

function createFlow(step) {
  let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("data-auto-animate", "true");
  svg.setAttribute("data-id", "flow-svg");

  let container = document.getElementById(`svg-container-${step}`);
  container.appendChild(svg);

  let totalWidth = 1000;
  let totalHeight = 500;
  svg.setAttribute("width", totalWidth);
  svg.setAttribute("height", totalHeight);
  
  let margin = 70;
  let currentX = 0;
  let currentY = margin / 2;
  let layerHeight = 50;
  let splitHeightUp = (totalHeight - 2 * layerHeight - 2 * margin) / 2;
  let splitHeightDown = splitHeightUp + layerHeight + 2 * margin;
  let singleHeight = (totalHeight - layerHeight) / 2;  

  currentY = splitHeightUp;
  let input_left = new Input(svg, ["Left", "Record"], currentX, currentY);
  currentY = splitHeightDown;
  let input_right = new Input(svg, ["Right", "Record"], currentX, currentY);

  let png_name = `network-architecture-${("0" + step).slice(-2)}`;
  let png_dpi = 300;
  if (step == 0) {
    saveSvgAsPng(svg, png_name, png_dpi);
    return svg;
  }
  
  currentX += input_left.width + margin;
  currentY = (totalHeight - layerHeight) / 2;
  let encoder = new Encoder(svg, ["Similarity", "Encoder"], currentX, currentY);
  connectLayers(svg, input_left, encoder);
  connectLayers(svg, input_right, encoder);

  if (step == 1) {
    saveSvgAsPng(svg, png_name, png_dpi);
    return svg;
  }

  currentX += encoder.width + margin;
  currentY = splitHeightUp;
  let field_dense_begin = new Dense(svg, ["Field", "Network"], currentX, currentY);
  currentY = splitHeightDown;
  let field_dense_end = new Dense(svg, ["Field", "Network"], currentX, currentY);
  createEllipsis(svg, "(x No fields)", field_dense_begin, field_dense_end);
  connectLayers(svg, encoder, field_dense_begin);
  connectLayers(svg, encoder, field_dense_end);

  if (step == 2) {
    saveSvgAsPng(svg, png_name, png_dpi);
    return svg;
  }

  currentX += field_dense_begin.width + margin;
  currentY = splitHeightUp;
  let field_prediction_begin = new SoftMax(svg, ["Field", "Prediction"], currentX, currentY);
  currentY = splitHeightDown;
  let field_prediction_end = new SoftMax(svg, ["Field", "Prediction"], currentX, currentY);
  createEllipsis(svg, "(x No fields)", field_prediction_begin, field_prediction_end);
  connectLayers(svg, field_dense_begin, field_prediction_begin);
  connectLayers(svg, field_dense_end, field_prediction_end);

  if (step == 3) {
    saveSvgAsPng(svg, png_name, png_dpi);
    return svg;
  }

  currentX += field_prediction_begin.width + margin;
  currentY = singleHeight;
  let record_dense = new Dense(svg, ["Record", "Network"], currentX, currentY);
  connectLayers(svg, field_prediction_begin, record_dense);
  connectLayers(svg, field_prediction_end, record_dense);

  if (step == 4) {
    saveSvgAsPng(svg, png_name, png_dpi);
    return svg;
  }

  currentX += record_dense.width + margin;
  currentY = singleHeight;
  let record_prediction = new SoftMax(svg, ["Record", "Prediction"], currentX, currentY);
  connectLayers(svg, record_dense, record_prediction);

  if (step == 5) {
    saveSvgAsPng(svg, png_name, png_dpi);
    return svg;
  }

  createAnnotatedBox(svg, [
    encoder,
    field_dense_begin, field_dense_end,
    field_prediction_begin, field_prediction_end], "P",
    margin = 20);
  saveSvgAsPng(svg, png_name, png_dpi);
  return svg;
}
