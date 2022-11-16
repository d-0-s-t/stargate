import { Point } from "./point.js"
import { CONTROLS } from "./controls.js"

/**
 * @typedef {object} Shape
 * @property {Point[]} path
 * @property {string} color
 */

/**
 * @typedef {object} ShapeCollection
 * @property {Point[][]} shapes
 * @property {string} color
 */

const COLORS = [
	"yellow",
	"pink",
	"orange",
	"red",
	"violet",
	"#08eba9"
]

/** @type {HTMLCanvasElement} */
const canvas = (document.querySelector("#mainCanvas"))
/** @type {HTMLImageElement} */
const halImage = document.querySelector("#hal")
/** @type {HTMLDivElement} */
const backgroundElement = document.querySelector("#backgroundElement")
/** @type {HTMLImageElement} */
const titleImage = document.querySelector("#title")
/** @type {HTMLDivElement} */
const eclipsingObject = document.querySelector("#eclipsingObject")

/** the position where artefacts are created. Its at a distance from camera so
 * as to not make it obvious when they spawn. The spawn event gets hidden in the noise
 */
const SPAWN_POSITION = 10000
/** distance between two artifact patterns or more precisely 
 * distance between the start points of two artefact patterns */
const SEPARATION_DISTANCE = 1500
/**
 * amount of distance to travel before new artifacts are created
 */
const SPAWNING_DISTANCE = SEPARATION_DISTANCE
const SPAWN_COUNT = 1

/** 
 * Amount of averlap allowed. This together with SEPARATION_DISTANCE
 * control the density of artefacts
 */
const OVERLAP = SEPARATION_DISTANCE / 2
/** shadow blur should be a constant but is also based on the canvas width */
let SHADOW_BLUR = 30
const POSTER_ASPECT_RATIO = 2 / 3
/** Renders on right */
const shapeCollectionA = /** @type {ShapeCollection[]} */ ([])
/** Renders on left */
const shapeCollectionB = /** @type {ShapeCollection[]} */ ([])
let previousTime = 0
let canvasHalfWidth = canvas.width / 2
let canvasHalfHeight = canvas.height / 2
let context = canvas.getContext("2d")
let distanceTravelled = 0

const SETTINGS = {
	speed: 4.3,
	spacing: 0.59,
	focalLength: 100,
	rotation: 0
}
let previousRotation = 0
const boundaryExtent = {
	x: 0,
	y: 0,
	width: 0,
	height: 0
}
let fpsInterval = 0
let fps = 0

const isMobileDevice = (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase()))
if (isMobileDevice) {
	document.querySelector("#controlsContainer").classList.add("hidden")
	document.querySelector("#toggleControls").classList.remove("active")
}


/** @type {CONTROLS_TYPES.BaseProperty} */
const SCHEMA = {
	"properties": {
		speed: {
			type: "slider",
			min: 1,
			max: 10
		},
		focalLength: {
			type: "slider",
			min: 10,
			max: 300
		},
		spacing: {
			type: "slider",
			min: 0.1,
			max: 1.4,
			onChange: function() {
				xPosition = canvas.width * SETTINGS.spacing
			}
		},
		rotation: {
			type: "slider",
			min: 0,
			max: Math.PI * 2,
			onChange: function() {
				context.translate(canvas.width / 2, canvas.height / 2)
				context.rotate(SETTINGS.rotation - previousRotation)
				context.translate(-canvas.width / 2, -canvas.height / 2)
				previousRotation = SETTINGS.rotation
			}
		}
	}
}

let xPosition = 100

function start() {
	resize()
	placePreRenders()
	const startAt = 4000
	createShapes(startAt, (SPAWN_POSITION - startAt) / SEPARATION_DISTANCE)
	new CONTROLS(SCHEMA, document.getElementById("controlsContainer"), SETTINGS)
	window.requestAnimationFrame(animate)
}

function resize() {
	canvas.height = window.innerHeight
	canvas.width = Math.round(canvas.height * POSTER_ASPECT_RATIO)
	if (canvas.width > window.innerWidth) {
		canvas.width = window.innerWidth
		canvas.height = Math.round(canvas.width / POSTER_ASPECT_RATIO)
	}

	canvasHalfWidth = canvas.width / 2
	canvasHalfHeight = canvas.height / 2
	context = canvas.getContext("2d")
	const bounds = canvas.getBoundingClientRect()
	const halImageWidth = canvasHalfWidth / 2
	let eclipsingObjectYPosition = bounds.y + (canvas.height * 0.1)
	halImage.width = halImageWidth
	halImage.style.top = eclipsingObjectYPosition + "px"
	titleImage.width = canvas.width * 0.75
	titleImage.style.top = bounds.y + (canvas.height * 0.9) + "px"
	eclipsingObject.style.width = halImageWidth + "px"
	eclipsingObject.style.height = halImageWidth + "px"
	eclipsingObject.style.top = eclipsingObjectYPosition + "px"

	backgroundElement.style.width = canvas.width + "px"
	backgroundElement.style.height = canvas.height + "px"
	eclipsingObject.style.transition = ""
	setTimeout(function() {
		eclipsingObject.style.transition = "top 6000ms ease-in-out"
		eclipsingObject.style.top = eclipsingObjectYPosition + (halImageWidth * 0.56) + "px"
	})
	xPosition = canvas.width * SETTINGS.spacing
	context.shadowBlur = SHADOW_BLUR
	const ext = canvas.height / 4
	boundaryExtent.x = -ext
	boundaryExtent.y = -ext
	boundaryExtent.width = canvas.width + ext * 2
	boundaryExtent.height = canvas.height + ext * 2
	SHADOW_BLUR = canvas.width / 21

	context.translate(canvas.width / 2, canvas.height / 2)
	context.rotate(SETTINGS.rotation)
	context.translate(-canvas.width / 2, -canvas.height / 2)
}

function placePreRenders() {

}

function draw() {
	context.clearRect(boundaryExtent.x, boundaryExtent.y, boundaryExtent.width, boundaryExtent.height)

	for (let i = shapeCollectionA.length - 1; i > -1; i--)
		drawShapeCollection(shapeCollectionA[i], true)
	for (let i = shapeCollectionB.length - 1; i > -1; i--)
		drawShapeCollection(shapeCollectionB[i], false)
}

/**
 * @param {number} timeStamp
 */
function animate(timeStamp) {
	window.requestAnimationFrame(animate)
	const delta = timeStamp - previousTime
	previousTime = timeStamp
	const distanceMoved = delta * SETTINGS.speed
	distanceTravelled += distanceMoved

	if (distanceTravelled > SPAWNING_DISTANCE) {
		distanceTravelled = 0
		createShapes(SPAWN_POSITION, SPAWN_COUNT)
	}

	moveCollection(shapeCollectionA, distanceMoved)
	moveCollection(shapeCollectionB, distanceMoved)

	draw()

	//log FPS
	/* fps++
	fpsInterval += delta
	if (fpsInterval > 1000) {
		fpsInterval -= 1000
		console.log(fps)
		fps = 0
	} */
}

/**
 * 
 * @param {ShapeCollection[]} collection 
 * @param {number} displacement 
 */
function moveCollection(collection, displacement) {
	for (let i = 0; i < collection.length; i++) {
		moveShapes(collection[i].shapes, displacement)
		if (!collection[i].shapes.length) {
			collection.splice(i, 1)
			i--
		}
	}
}

/**
 * @param {Point[][]} collection 
 * @param {number} displacement
 * @returns {number}
 */
function moveShapes(collection, displacement) {
	for (let i = 0; i < collection.length; i++) {
		const points = collection[i]
		let allOut = true
		for (let j = 0; j < points.length; j++) {
			points[j].x -= displacement
			if (points[j].x > -200)
				allOut = false
		}
		if (allOut) {
			collection.splice(i, 1)
			i--
		}
	}
	return collection.length
}

/**
 * 
 * @param {ShapeCollection} shapeCollection 
 * @param {boolean} left 
 */
function drawShapeCollection(shapeCollection, left) {
	context.beginPath()
	context.fillStyle = shapeCollection.color
	context.shadowColor = shapeCollection.color
	if (shapeCollection.shapes[0][0].x < 4000)
		context.shadowBlur = SHADOW_BLUR
	else
		context.shadowBlur = 0
	shapeCollection.shapes.forEach(shape => drawShape(shape, left))
	context.fill()
}

/**
 * 
 * @param {Point[]} shape 
 * @param {boolean} left 
 */
function drawShape(shape, left) {
	const points = /** @type {Point[]} */ ([])
	shape.forEach(point => {
		points.push(convertTo3D(point, left))
	})
	context.moveTo(points[0].x, points[0].y)
	for (let i = 1; i < points.length; i++) {
		context.lineTo(points[i].x, points[i].y)
	}
	context.closePath()
}

/**
 * There are no 3d points. Not even logical ones. We can take advantage of the situation 
 * here as the artefacts do no displace in x axis (in 3D). The x - position of the artifact is 
 * inferred as its z - position in 3d. The artefacts will be divided as occupying two halves. 
 * Each half will be alloted an x position in 3d: positive and negative. 
 * This x - Position is arbitrary. 
 * @param {Point} point
 * @param {boolean} [left]
 * @returns {Point}
 */
function convertTo3D(point, left) {
	const screenPoint = new Point((left ? -xPosition : xPosition), point.y * canvas.height)
	let scale = SETTINGS.focalLength / (point.x + SETTINGS.focalLength)
	if (scale <= 0) // basically our clipping logic
		scale = 100
	screenPoint.scale(scale)
	screenPoint.x += canvasHalfWidth
	screenPoint.y += canvasHalfHeight
	return screenPoint
}

/**
 * @param {number} position 
 * @param {number} count 
 */
function createShapes(position, count) {
	let startX = position
	for (let i = 0; i < count; i++) {
		shapeCollectionA.push({
			color: pickRandom(COLORS),
			shapes: pickRandom(PATTERN_FUNCTION)(startX)
		})
		startX += SEPARATION_DISTANCE
	}
	startX = position
	for (let i = 0; i < count; i++) {
		shapeCollectionB.push({
			color: pickRandom(COLORS),
			shapes: pickRandom(PATTERN_FUNCTION)(startX)
		})
		startX += SEPARATION_DISTANCE
	}
	//webPattern can be anoyying if it pops up a lot
	if (Math.random() < 0.05) {
		shapeCollectionA.push({
			color: pickRandom(COLORS),
			shapes: createWebPattern(SPAWN_POSITION)
		})
		shapeCollectionB.push({
			color: pickRandom(COLORS),
			shapes: createWebPattern(SPAWN_POSITION)
		})
	}
}

/**
 * @template T
 * @param {Array<T>} arr
 * @returns {T}
 */
function pickRandom(arr) {
	return arr[Math.floor(Math.random() * arr.length)]
}

// ---------------------------------------------------  SHAPES  ----------------------------------------------

const HEIGHT = 4

const PATTERN_FUNCTION = [
	createFringePattern,
	createLinesPattern,
	createCubesPattern,
	createVerticalLinePatterns,
	createStripesPattern,
	createVerticalBlockPatterns,
	//createLadderPattern,
	//createWebPattern,
]


/**
 * @param {number} x
 * @returns {Point[][]}
 */
function createFringePattern(x) {
	const shapes = /** @type {Point[][]} */ ([])
	let xPos = -OVERLAP / 2 + x + (Math.random() * OVERLAP)

	const shapeFunction = pickRandom(SHAPE_FUNCTIONS)
	const progressFunction = pickRandom(PROGRESS_FUNCTIONS)
	const yOffset = Math.random() * HEIGHT / 2 * (Math.random() > 0.5 ? -1 : 1)
	/**
	 * @param {number} x 
	 * @param {number} height 
	 * @param {number} width 
	 * @param {number} spacing 
	 * @param {number} spread 
	 */
	function createColumn(x, height, width, spacing, spread) {
		const halfSpread = spread / 2
		let y = -halfSpread - height + yOffset
		do {
			y += (height + spacing)
			shapes.push(shapeFunction(x, y, width, height))
		} while (y < halfSpread)
	}

	const length = (1000 + (Math.random() * 2000))
	let progress = 0
	const xSpacing = 30 * Math.random()
	do {
		const width = 40 + (Math.random() * 25)
		const height = 0.04
		createColumn(xPos + progress, height, width, 0.01, progressFunction(progress / length) * HEIGHT)
		progress += (width + xSpacing)
	} while (progress < length)

	return shapes
}

/**
 * @param {number} x
 * @returns {Point[][]}
 */
function createLinesPattern(x) {
	const shapes = /** @type {Point[][]} */ ([])

	const totalShapes = 2 + (Math.random() * 5)
	for (let i = 0; i < totalShapes; i++) {
		const count = Math.random() * 5
		let currentItem = 0
		const height = 0.1 * Math.random()
		let xPos = -OVERLAP / 2 + x + (Math.random() * OVERLAP)
		const yPos = (HEIGHT - 1) * Math.random() * (Math.random() > 0.5 ? -1 : 1)
		const shapeFunction = pickRandom(SHAPE_FUNCTIONS)
		do {
			shapes.push(shapeFunction(xPos, yPos, 20 + (200 * Math.random()), height))
			xPos += Math.random() * 300
			currentItem++
		} while (currentItem < count)
	}

	return shapes
}

/**
 * @param {number} x 
 * @returns {Point[][]}
 */
function createLadderPattern(x) {
	let height = 0.1 + (Math.random() * 0.1)
	const width = 400 + (1500 * Math.random())
	let yOffset = Math.random() * HEIGHT / 2 * (Math.random() > 0.5 ? -1 : 1)
	let xPos = -OVERLAP / 2 + x + (Math.random() * OVERLAP)
	const shapes = /** @type {Point[][]} */ ([])
	shapes.push(createRectangle(xPos, yOffset, width, 0.004))
	shapes.push(createRectangle(xPos, yOffset + height, width, 0.004))

	let ladderPosition = xPos
	const limit = xPos + width
	const ladderStep = 20 + 100 * Math.random()
	const stepExtenstion = Math.random() * height
	yOffset -= stepExtenstion / 2
	height += stepExtenstion
	do {
		ladderPosition += ladderStep
		shapes.push(createRectangle(ladderPosition, yOffset, 3, height))
	} while (ladderPosition < limit)

	return shapes
}

/**
 * 
 * @param {number} x 
 * @returns {Point[][]}
 */
function createCubesPattern(x) {
	const height = 0.1 + (Math.random() * 0.1)
	const width = height * 100
	const shapes = /** @type {Point[][]} */ ([])
	const xStart = -OVERLAP / 2 + x + (Math.random() * OVERLAP)

	let yOffset = -HEIGHT / 2
	do {
		const number = 30 + (Math.random() * 20)
		let xPos = xStart + ((width + 10) * Math.floor(Math.random()))
		for (let i = 0; i < number; i++) {
			shapes.push(createRectangle(xPos, yOffset, width, height))
			xPos += width + 10
		}
		yOffset += height * 2
	}
	while (yOffset < HEIGHT)
	return shapes
}

/**
 * @param {number} x
 * @returns {Point[][]} 
 */
function createVerticalLinePatterns(x) {
	const height = 0.2 + Math.random() * 0.6
	const width = 3
	const shapes = /** @type {Point[][]} */ ([])
	const toCreate = 1 + Math.random() * 3
	let count = 0
	do {
		let xPos = -OVERLAP / 2 + x + (Math.random() * OVERLAP)
		let yOffset = (Math.random() * HEIGHT / 3) * (Math.random() > 0.5 ? -1 : 1)
		const lines = 15 + Math.random() * 15
		for (let i = 0; i < lines; i++) {
			shapes.push(createRectangle(xPos, yOffset, width, height))
			xPos += 50 + Math.random() * 100
		}
		count++
	} while (count < toCreate)
	return shapes
}

/**
 * @param {number} x
 * @returns {Point[][]}
 */
function createWebPattern(x) {
	const length = 4000
	const lineThickness = 0.01
	const tessellation = 50

	const shapes = /**@type {Point[][]}*/ ([])

	const numLines = 7
	const yDifference = HEIGHT / (numLines - 1)
	let xStep = length / (tessellation + 1)
	const yStep = yDifference / (tessellation + 1)
	let yPos = -HEIGHT / 2
	for (let i = 0; i < numLines; i++) {
		const line = []
		let xPos = x
		for (let j = 0; j <= tessellation; j++) {
			line.push(new Point(xPos, yPos))
			xPos += xStep
			yPos += yStep
		}
		const start = line.length
		for (let j = start; j > 0; j--) {
			line.push(new Point(line[j - 1].x, line[j - 1].y + lineThickness))
		}
		shapes.push(line)
	}

	yPos = HEIGHT / 2
	for (let i = 0; i < numLines; i++) {
		const line = []
		let xPos = x
		for (let j = 0; j <= tessellation; j++) {
			line.push(new Point(xPos, yPos))
			xPos += xStep
			yPos -= yStep
		}
		const start = line.length
		for (let j = start; j > 0; j--) {
			line.push(new Point(line[j - 1].x, line[j - 1].y + lineThickness))
		}
		shapes.push(line)
	}

	//curveline
	const curve = []
	let xPos = 0
	const progressFunction = pickRandom(PROGRESS_FUNCTIONS)
	for (let j = 0; j < tessellation; j++) {
		yPos = (progressFunction(xPos / length) * HEIGHT) - (HEIGHT / 2)
		curve.push(new Point(x + xPos, yPos))
		xPos += xStep
	}
	for (let j = tessellation; j > 0; j--) {
		curve.push(new Point(curve[j - 1].x, curve[j - 1].y + 0.02))
	}
	shapes.push(curve)

	return shapes
}

/**
 * @param {number} x
 * @returns {Point[][]}
 */
function createStripesPattern(x) {
	const shapes = /** @type {Point[][]} */ ([])
	let xPos = -OVERLAP / 2 + x + (Math.random() * OVERLAP)

	const shapeFunction = pickRandom(SHAPE_FUNCTIONS)
	const progressFunction = pickRandom(PROGRESS_FUNCTIONS)
	const progressFunction2 = pickRandom(PROGRESS_FUNCTIONS)
	const yOffset = Math.random() * HEIGHT / 2 * (Math.random() > 0.5 ? -1 : 1)

	const length = 1200 + (1600 * Math.random())
	const height = HEIGHT / 2 + (HEIGHT / 2 * Math.random())
	const stripeHeight = 0.1 * Math.random() * 0.2
	let y1 = 0
	do {
		const l1 = progressFunction(y1 / height) * length
		shapes.push(shapeFunction(xPos + (progressFunction2(y1 / height) * 600), yOffset + y1, l1, stripeHeight))
		y1 += stripeHeight + 0.01
	} while (y1 <= height)

	return shapes
}

/**
 * @param {number} x
 * @returns {Point[][]}
 */
function createVerticalBlockPatterns(x) {
	const shapes = /** @type {Point[][]} */ ([])
	let xPos = -OVERLAP / 2 + x + (Math.random() * OVERLAP)

	const progressFunction = pickRandom(PROGRESS_FUNCTIONS)
	const tessellation = 20
	const xLimit = xPos + 1200 + (1600 * Math.random())
	const width = 20 + (Math.random() * 20)
	const yStep = HEIGHT / tessellation
	const span = 600 + (Math.random() * 600)
	const template = []
	let innerY = -HEIGHT / 2
	for (let i = 0; i < tessellation; i++) {
		template.push(progressFunction((innerY / HEIGHT) + 0.5) * span)
		innerY += yStep
	}
	do {
		const line = /** @type {Point[]} */ ([])
		innerY = -HEIGHT / 2
		for (let i = 0; i < tessellation; i++) {
			line.push(new Point(xPos + template[i], innerY))
			innerY += yStep
		}
		for (let i = line.length - 1; i >= 0; i--) {
			line.push(new Point(line[i].x + width, line[i].y))
		}
		xPos += width + 30
		shapes.push(line)
	}
	while (xPos < xLimit)

	return shapes
}
// -------------------------------------------------  BASE SHAPES  ------------------------------------------------

const SHAPE_FUNCTIONS = [
	createRectangle,
	createBackWardArrow,
	createForwardArrow,
	createSpear
]

/**
 * @param {number} x 
 * @param {number} y 
 * @param {number} width 
 * @param {number} height 
 * @returns {Point[]}
 */
function createRectangle(x, y, width, height) {
	const x2 = x + width
	const y2 = y + height
	return [new Point(x, y),
		new Point(x2, y),
		new Point(x2, y2),
		new Point(x, y2)
	]
}

/**
 * @param {number} x 
 * @param {number} y 
 * @param {number} width 
 * @param {number} height 
 * @returns {Point[]}
 */
function createForwardArrow(x, y, width, height) {
	const x2 = x + width
	const y2 = y + height
	return [new Point(x, y + height / 2),
		new Point(x2, y),
		new Point(x2, y2)
	]
}

/**
 * @param {number} x 
 * @param {number} y 
 * @param {number} width 
 * @param {number} height 
 * @returns {Point[]}
 */
function createBackWardArrow(x, y, width, height) {
	const x2 = x + width
	const y2 = y + height
	return [new Point(x, y),
		new Point(x, y2),
		new Point(x2, y + height / 2)
	]
}

/**
 * @param {number} x 
 * @param {number} y 
 * @param {number} width 
 * @param {number} height 
 * @returns {Point[]}
 */
function createSpear(x, y, width, height) {
	const hw = width / 2
	const hh = height / 2
	const x1 = x + hw
	const y2 = y + hh
	return [new Point(x, y2),
		new Point(x1, y),
		new Point(x + width, y2),
		new Point(x1, y + height)
	]
}

// ----------------------------------------------  PROGRESS FUNCTIONS  ----------------------------------------------

const PROGRESS_FUNCTIONS = [
	linearEF,
	invertEF,
	circularEF,
	sinEF,
	cosEF
]

/**
 * @param {number} x 
 * @returns {number}
 */
function invertEF(x) {
	return 1 - x
}

/**
 * @param {number} x 
 * @returns {number}
 */
function linearEF(x) {
	return x
}

/**
 * @param {number} x 
 * @returns {number}
 */
function cosEF(x) {
	return Math.cos(x * Math.PI)
}

/**
 * 
 * @param {number} x 
 * @returns {number}
 */
function sinEF(x) {
	return Math.sin(x * Math.PI)
}

/**
 * @param {number} x
 * @returns {number}
 */
function circularEF(x) {
	let t = x < 0.5 ? x : 1 - x
	return Math.sqrt(1 - Math.pow(t - 1, 2))
}

window.onload = start
window.onresize = resize