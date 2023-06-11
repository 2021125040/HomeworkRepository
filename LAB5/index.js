const express = require('express'); //add required modules at the top
const sqlite3 = require('sqlite3').verbose();
const app = express(); // create an app instance
const port = 3000; //port 설정
const fs = require('fs');
var http = require('http');

// Connect to the database
const db = new sqlite3.Database('product.db');
app.use(express.static(__dirname+'/public'));


app.get('/', (req, res) => {
  fs.readFile(__dirname + '/index.html', 'utf-8', (err, data) => {
    const sortSelect = req.query.sortSelect;
    const categorySelect = req.query.categorySelect;

    // Map the sort options to their corresponding SQL clauses
    const sortOptions = {
      default: '', // No sorting
      asc: 'ORDER BY product_price ASC', // Low to High price
      desc: 'ORDER BY product_price DESC', // High to Low price
    };

    // Set the SQL query based on the selected sort option and category
    let query = 'SELECT * FROM products';

    if (categorySelect && categorySelect !== 'all') {
      query += ` WHERE product_category = '${categorySelect}'`;
    }

    if (sortSelect && sortOptions[sortSelect]) {
      query += ` ${sortOptions[sortSelect]}`;
    }

    db.all(query, [], (err, rows) => {
      if (err) {
          console.error(err);
          res.status(500).send('Internal Server Error');
          return;
        }

      let template = '';
      rows.forEach((row) => {
        template += `<a href="/product/${row.product_id}" class="bookContainer">
          <h2>${row.product_title}</h2>
          <img src="${row.product_image}">
          <div class="bookInfo">
            <p>가격: ${row.product_price}</p>
            <p>카테고리: ${row.product_category}</p>
          </div>
        </a>`;
      });

      const placeholder = '<div id="booksContainer"></div>';
      const modifiedHtml = data.replace(placeholder, `<div id="booksContainer">${template}</div>`);
      res.send(modifiedHtml);
    });
  });
});

app.use(express.urlencoded({ extended: true }));
const commentFilePath = 'comment.json';

app.get('/product/:product_id', (req, res) => {
  const productId = req.params.product_id;

  db.get('SELECT * FROM products WHERE product_id = ?', [productId], (err, row) => {
    // Render the product detail page with the retrieved product information
    if (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
      return;
    }

    if (!row) {
      res.status(404).send('Product not found');
      return;
    }

    // Read the comments from the JSON file
    let comments = {};
    try {
      const commentData = fs.readFileSync(commentFilePath, 'utf-8');
      comments = JSON.parse(commentData);
    } catch (error) {
      console.error('Error reading comments:', error);
    }

    // Get the comments for the specific product
    const productComments = comments[productId] || [];

    res.send(`<!DOCTYPE html>
    <html>
        <head>
            <meta charset="utf-8">
            <link rel="stylesheet" href="/main.css">
        </head>
        <body>
          <div id="booksContainer">
            <div href="/product/${row.product_id}" class="bookContainer">
              <h2>${row.product_title}</h2>
              <img src="${row.product_image}">
          </div>
            </div>
            <p>id: ${row.product_id}</p>
            <p>가격: ${row.product_price}</p>
            <p>카테고리: ${row.product_category}</p>
        <!-- Display existing comments -->
          <h3>Comments</h3>
          <ul>
            ${productComments.map(comment => `<li>${comment}</li>`).join('')}
          </ul>

        <!-- Form to add new comment -->
          <form action="/product/${productId}" method="post">
            <input type="text" name="comment" placeholder="Add a comment">
            <button type="submit">Submit</button>
          </form>
    `);
  });
});
app.post('/product/:product_id', (req, res) => {
  const productId = req.params.product_id;
  const newComment = req.body.comment;

  // Read the existing comments from the JSON file
  let comments = {};
  try {
    const commentData = fs.readFileSync(commentFilePath, 'utf-8');
    comments = JSON.parse(commentData);
  } catch (error) {
    console.error('Error reading comments:', error);
  }

  // Initialize an empty array if comments[productId] doesn't exist
  if (!comments[productId]) {
    comments[productId] = [];
  }

  // Append the new comment to the comments array for the specific product
  comments[productId].push(newComment);

  // Write the updated comments back to the JSON file
  fs.writeFileSync(commentFilePath, JSON.stringify(comments));

  // Redirect back to the product detail page
  res.redirect(`/product/${productId}`);
});


app.get('/login', function (req, res) {
  res.sendFile(__dirname+'/login.html');
});
app.get('/signup', function (req, res) {
  res.sendFile(__dirname+'/signup.html');
});

// Start the server
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Handle termination signals
process.on('SIGINT', () => {
  console.log('Server has been terminated forcefully.');
  process.exit(0); // Exit the process with a success code (0)
});