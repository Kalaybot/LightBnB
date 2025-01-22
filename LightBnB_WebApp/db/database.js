const { query } = require("express");
const properties = require("./json/properties.json");
const users = require("./json/users.json");

// DB Connection
const { Pool } = require("pg");

const pool = new Pool({
  user: "kylealexanderbautista",
  password: "labber",
  host: "localhost",
  database: "lightbnb",
});

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = (email) => {

  return pool
    .query(`SELECT * FROM users WHERE email = $1;`, [email])
    .then((result) => result.rows[0] || null)
    .catch((err) => {
      console.log('Error fetching user:', err.message)
    });
}

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = (id) => {

  return pool
    .query(`SELECT * FROM users WHERE id = $1;`, [id])
    .then((result) => result.rows[0] || null)
    .catch((err) => {
      console.log('Error fetching user by id:', err.message)
    });
}

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = (user) => {
  
  return pool
    .query(
      `INSERT INTO users (name, email, password)
      VALUES ($1, $2, $3)
      RETURNING *;`,
      [user.name, user.email, user.password]
    )
    .then((result) => result.rows[0])
    .catch((err) => {
      console.log("Error adding user:", err.message)
    });
}

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = (guest_id, limit = 10) => {

  return pool
    .query(
      `SELECT properties.*, reservations.*, avg(rating) as average_rating
        FROM reservations
        JOIN properties ON reservations.property_id = properties.id
        JOIN property_reviews ON properties.id = property_reviews.property_id
        WHERE reservations.guest_id = $1
        AND reservations.end_date >= now()::date
        GROUP BY properties.id, reservations.id
        ORDER BY reservations.start_date
        LIMIT $2;`,
      [guest_id, limit]
    )
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.log("Error getting all your reservation:", err.message);
    })
}

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = (options, limit = 10) => {

  // Array to hold query
  const queryParams = [];
  // Initialize Query Params & Base Query
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  // WHERE 1-1 Clauses, store different filtering conditions
  const whereClause = [];

  // Filter by City
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `WHERE city LIKE $${queryParams.length} `;
  }
  // Filter by Owner_ID
  if (options.owner_id) {
    queryParams.push(options.owner_id);
    whereClause.push(`properties.owner_id = $${queryParams.length} `);
  }
  // Filter by Minimum Price
  if (options.minimum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 100);
    whereClause.push(`cost_per_night >= $${queryParams.length} `);
  }
  // Filter by Maximum Price
  if (options.maximum_price_per_night) {
    queryParams.push(options.maximum_price_per_night * 100);
    whereClause.push(`cost_per_night <= $${queryParams.length} `);
  }
  // Filter by Minimum Rating
  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    whereClause.push(`avg(property_reviews.rating) >= $${queryParams.length} `);
  }

  // Add WHERE clause (if filters exist)
  if (whereClause.length > 0) {
    queryString += ' WHERE ' + whereClause.join(' AND ');
  }

  // Results for GROUP, ORDER, LIMIT 
  queryParams.push(limit);
  queryString += `
  GROUP BY properties.id
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  // Logging the Final Query (Debugging)
  console.log(queryString, queryParams);

  // Execute Query then return results
  return pool.query(queryString, queryParams).then((res) => res.rows);
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
