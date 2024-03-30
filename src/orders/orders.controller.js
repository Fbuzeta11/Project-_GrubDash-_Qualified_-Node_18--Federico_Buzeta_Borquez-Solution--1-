const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

// TODO: Implement the /orders handlers needed to make the tests pass

//middleware
// Iterate over orders.  If an order.id that matches :orderId is found, assign that value to res.locals.order; if not, return a 404.
function orderExists(req, res, next) {
  const { orderId } = req.params;
  const foundOrder = orders.find((order) => order.id === orderId);

  if (foundOrder) {
    res.locals.order = foundOrder;
    next();
  } else {
    next({ status: 404, message: `Order not found: ${orderId}` });
  }
}

// Assign to data req.body.data, defaulting to {}, then extract deliverTo from data.  Return 400 if `deliverTo` is nonexistent or empty.
function validateDeliverTo(req, res, next) {
  const { data: { deliverTo } = {} } = req.body;
  if (!deliverTo || deliverTo === "") {
    return next({ status: 400, message: "Order must include a deliverTo" });
  } else {
    next();
  }
}

// ^ Just as with previous middleware `validateDeliverTo()`, verify existence and non-emptiness of property
function validateMobileNumber(req, res, next) {
  const { data: { mobileNumber } = {} } = req.body;
  if (!mobileNumber || mobileNumber === "") {
    return next({ status: 400, message: "Order must include a mobileNumber" });
  } else {
    next();
  }
}

// Assign to data req.body.data, defaulting to {}, then extract dishes from data.  Return 400 if dishes not existent, or not array
function validateDishes(req, res, next) {
  const { data: { dishes } = {} } = req.body;
  if (!dishes) {
    return next({ status: 400, message: "Order must include a dish" });
  } else if (!Array.isArray(dishes) || dishes.length === 0) {
    return next({
      status: 400,
      message: "Order must include at least one dish",
    });
  } else {
    next();
  }
}

// Extract data from req.body.data, defaulting to {}, then extract dishes from data.  Iterate over data.dishes array, looking for first dish where .quantity is either not existent, not a number, not an int, or not > 0) and, if found, return a 400.
function validateDishQuantity(req, res, next) {
  const { data: { dishes } = {} } = req.body;
  const invalidDish = dishes.find(
    (dish, index) =>
      !dish.quantity ||
      typeof dish.quantity !== "number" ||
      !Number.isInteger(dish.quantity) ||
      dish.quantity <= 0,
  );
  if (invalidDish) {
    const index = dishes.indexOf(invalidDish);
    return next({
      status: 400,
      message: `Dish ${index} must have a quantity that is an integer greater than 0`,
    });
  } else {
    next();
  }
}

// Extract data from req.body.data, defaulting to {}, then extract .id from data.  Return a 400 if .id doesn't match :orderId.
function validateOrderIdMatch(req, res, next) {
  const { data: { id } = {} } = req.body;
  const { orderId } = req.params;
  if (id && id !== orderId) {
    return next({
      status: 400,
      message: `Order id does not match route id. Order: ${id}, Route: ${orderId}.`,
    });
  }
  next();
}

// Extract data from req.body.data, defaulting to {}, then extract .status from data.  If .status is nonexistent or its value not among validStatuses, return a 400.
function validateOrderStatus(req, res, next) {
  const { data: { status } = {} } = req.body;
  const validStatuses = [
    "pending",
    "preparing",
    "out-for-delivery",
    "delivered",
  ];
  if (!status || !validStatuses.includes(status)) {
    return next({
      status: 400,
      message:
        "Order must have a status of pending, preparing, out-for-delivery, delivered",
    });
  }
  next();
}

// If .status of the order found by `orderExists()` is 'delivered', return a 400.
function validateOrderDelivered(req, res, next) {
  const order = res.locals.order; // Assuming orderExists middleware sets this
  if (order.status === "delivered") {
    return next({
      status: 400,
      message: "A delivered order cannot be changed",
    });
  }
  next();
}


 //Controller functions for "/"  

function create(req, res) {
  const { data: { deliverTo, mobileNumber, dishes } = {} } = req.body;
  const newOrder = {
    id: nextId(), // here use imported function to generate random ID
    deliverTo,
    mobileNumber,
    dishes,
  };

  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
}


//  Respond in JSON with entire object thus `{"data":[array of order objects]}`
function list(req, res) {
  res.json({ data: orders });
}

//Controller functions for "/:orderId"  


function read(req, res) {
  res.json({ data: res.locals.order });
}


//  Extract data from req.body.data, defaulting to {}, then extract properties from data.  Use these to overwrite properties of existing order object (found by `orderExists()`).  Respond with updated order object in JSON.
function update(req, res) {
  const order = res.locals.order; // The existing order found by the orderExists middleware
  const { data: { deliverTo, mobileNumber, dishes, status } = {} } = req.body;

  order.deliverTo = deliverTo;
  order.mobileNumber = mobileNumber;
  order.dishes = dishes;
  order.status = status;

  res.json({ data: order });
}


//  Find the index point in orders array where order.id matches :orderId, returning a 404 if none found.  Otherwise, use this index to locate order and check its .status.  If not 'pending', return a 400; otherwise, excise this order from orders array and send a 204. 
function destroy(req, res, next) {
  const { orderId } = req.params;
  const index = orders.findIndex((order) => order.id === orderId);
  
  if (index === -1) { // i.e. nothing found
    return next({ status: 404, message: `Order not found: ${orderId}` });
  }
  const order = orders[index];
  if (order.status !== "pending") {
    return next({
      status: 400,
      message: `An order cannot be deleted unless it is pending`,
    });
  }
  // Conditions met.  Remove 1 order from the array, at index.
  orders.splice(index, 1);
  res.sendStatus(204);
}

//exports
module.exports = {
  create: [
    validateDeliverTo,
    validateMobileNumber,
    validateDishes,
    validateDishQuantity,
    create,
  ],
  list,
  read: [orderExists, read],
  update: [
    orderExists,
    validateDeliverTo,
    validateMobileNumber,
    validateDishes,
    validateDishQuantity,
    validateOrderIdMatch,
    validateOrderStatus,
    validateOrderDelivered,
    update,
  ],
  destroy: [orderExists, destroy],
};