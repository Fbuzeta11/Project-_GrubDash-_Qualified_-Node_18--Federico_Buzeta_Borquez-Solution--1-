const path = require("path");

// Use the existing dishes data
const dishes = require(path.resolve("src/data/dishes-data"));

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");

// TODO: Implement the /dishes handlers needed to make the tests pass


 //middleware  
//  Search array of dishes for one with an .id matching :dishId.  Assign it to response locals if found; return 404 if not.
function dishExists(req, res, next) {
  const { dishId } = req.params;
  const foundDish = dishes.find((dish) => dish.id === dishId);
  if (foundDish) {
    res.locals.dish = foundDish;
    return next();
  } else {
    return next({
      status: 404,
      message: `Dish does not exist: ${dishId}`,
    });
  }
}

//  Assign to data, data from req.body--or {} if undedfined.  Return 400 if property received as parameter is not (present in data, non-empty, and defined).
function validateProperties(propertyName) {
  return function (req, res, next) {
    const { data = {} } = req.body;
    if (
      data[propertyName] &&
      data[propertyName] !== "" &&
      data[propertyName] !== undefined
    ) {
      return next();
    }
    next({
      status: 400,
      message: `Dish must include a ${propertyName}`,
    });
  };
}

//  Assign to data, data from req.body--or {} if undefined. Return 400 if price, extracted from data.price, is not (existent and int and positive).
function validatePrice(req, res, next) {
  const { data: { price } = {} } = req.body;
  if (price && Number.isInteger(price) && price > 0) {
    return next();
  } else {
    return next({
      status: 400,
      message: "Dish must have a price that is an integer greater than 0",
    });
  }
}


 //controller functions for "/"  

//  Extract 4 dish properties from req.body.data, defaulting to {} if data undefined.  Construct newDish with these properties plus a generated ID, and append to dishes array.  Respond with 201 incl new dish.
function create(req, res) {
  const { data: { name, description, price, image_url } = {} } = req.body;
  const newDish = {
    id: nextId(), // here use imported function to generate random ID
    name: name,
    description: description,
    price: price,
    image_url: image_url,
  };
  dishes.push(newDish);
  res.status(201).json({ data: newDish });
}


//  Respond in JSON with with entire object thus `{"data":[array of dish objects]}`
function list(req, res) {
  res.json({ data: dishes });
}


//  Respond in JSON with object of specified dish thus `{"data":{dish object}}`, `res.locals.dish` having been set in prior middleware `dishExists()`
function read(req, res) {
  res.json({ data: res.locals.dish });
}

//  Verify match of :dishId with req.body.data.id.  If no, returns 400; otherwise, overwrites properties of existing dish object (found by `dishExists()`) with those from req.body.data (defaulting to {} if data undefined).  Respond with updated dish object in JSON.
function update(req, res, next) {
  const { dishId } = req.params;
  const { data: { id, name, description, price, image_url } = {} } = req.body;

  if (id && id !== dishId) {
    return next({
      status: 400,
      message: `Dish id does not match route id. Dish: ${id}, Route: ${dishId}`,
    });
  }

  const dish = res.locals.dish;

  dish.name = name;
  dish.description = description;
  dish.price = price;
  dish.image_url = image_url;

  res.json({ data: dish });
}


//exports
module.exports = {
  create: [
    validateProperties("name"),
    validateProperties("description"),
    validateProperties("image_url"),
    validatePrice,
    create,
  ],
  list,
  read: [dishExists, read],
  update: [
    dishExists,
    validateProperties("name"),
    validateProperties("description"),
    validateProperties("image_url"),
    validatePrice,
    update,
  ],
};