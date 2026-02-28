//Broinson Jeyarajah 
//2024-12-05

// REFERENCES
//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray
//https://www.w3schools.com/jsref/jsref_isarray.asp


"use strict";

//  Import Dependencies 
const express = require('express');
const path = require('path');
const app = express();
const session = require('express-session');
const mysql = require('mysql2');

// Express-validator
const { check, validationResult } = require('express-validator');


// Setup Database Connection
const con = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: '1234',
  database: 'storedb'
});


con.connect((err) => { //checking to see if connection is valid
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
      console.log('Succesfully Connected to storedb!');
});

// Setup Session
app.use(session({
    secret: "thisismyrandomsuperkeyforrandomsecret",
    resave: false,
    saveUninitialized: true
}));

// Express Body-Parser
app.use(express.urlencoded({ extended: true }));

// Set Path to public and views folders
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');



// Validation Function for PHONE NUMEBR format
function customePhoneValidation(phonenumber) {
    //Rejex Pattern
    const phoneRegex = /^[0-9]{3}\-?[0-9]{3}\-?[0-9]{4}$/;
    if (!phoneRegex.test(phonenumber)) {
        throw new Error('Please enter correct phone format!');
    }
    return true;
}


// ***** Setup Different Routes (pages) ***** 
// Home Page - GET Method
app.get('/', (req, res) => {
    // No need to add .ejs extension
    //as of now, data/errors not selected
    res.render('form', { pageData: {}, errors: undefined, pageOutputData: undefined });
});

// Home Page - POST Method
app.post('/', [
    //Validation and check all fields
    check('name', 'Name field is required!').notEmpty(),
    check('email').isEmail().withMessage("Please enter a valid email address!"), 
    check('phone').custom(customePhoneValidation),
    check('address', 'Address field is required!').notEmpty(),
    check('city', 'City field is required!').notEmpty(),
    check('province', 'Province field is required!').notEmpty(),
    check('selectedItems').custom(itemcheck => { //checks if no item is chosen
        if (!itemcheck || (Array.isArray(itemcheck) && itemcheck.length === 0)) {
            throw new Error('At least one item needs to be choosen to proceed with payment!');
        }
        return true;
    })
], async (req, res) => {
    const errors = validationResult(req);
     //Validates request; renders form with any errors (if existed)

    if (!errors.isEmpty()) {
        return res.render('form', { errors: errors.array(), pageData: req.body, pageOutputData: {} });
    } else {
        //Read form values
        const { name, address, city, province, email, phone, selectedItems } = req.body;

        //         // If No Errors - Display Output To User
        // // Read the form values
        // var name = req.body.name;
        // var email = req.body.email;
        // var phone = req.body.phone;
        // var postcode = req.body.postcode;
        // var lunch = req.body.lunch;
        // var tickets = req. body.tickets;
        // var campus = req.body.campus;

        //Declare Variables for calculations
        let subTotal = 0;
        let total = 0;
        let taxTotal = 0;
        let items = []; //store in empty error

        //selectedItems is an array
        const selectedItemsArray = Array.isArray(selectedItems) ? selectedItems : [selectedItems];
        // Process the selected items and calculates the total with respective fields
        selectedItemsArray.forEach(item => {
            let [itemName, price] = item.split(',');
            price = Number(price);
            subTotal += price; //appends to price then taxTotal
            taxTotal += (price * 0.13);
            items.push(itemName);//appends to iteName variable
        });

        //validates if item is below 10
        if (subTotal <= 10) {
            return res.render('form', { 
                errors: [{ msg: 'The total amount is supposed to be more than $10! Please pick another item.'}], 
                selectedItemsArray: undefined,
                pageData: {},
                pageOutputData: undefined
            });
        }

        //total amount
        total = subTotal + taxTotal;

        // Initialize the session receipts in empty array
        if (!req.session.receipts) {
            req.session.receipts = [];  
        }

        // Store data in session for receipt page
        req.session.receipts.push({
            name,
            email,
            phone,
            address,
            city,
            province,
            selectedItems: items,
            subTotal,
            taxTotal,
            total
        });
        //saves into db using INSERT opeartor through Connection
        con.query( 
            `INSERT INTO userinfo (name, email, phone, address, city, province, selectedItems, subTotal, taxTotal, total) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
             //Inserts order data, logs in successfully or error appears, then redirects to page with info. 
            [name, email, phone, address, city, province, selectedItemsArray.join(', '), subTotal, taxTotal, total],
            (Error_Query) => {
                // Process Query Results Here
                if (Error_Query) {
                    console.log('Insert Query Error:', Error_Query);
                } else {
                    console.log("New Order has been Processed!");
                }
                // Redirect to receipt display after successful insert
                res.redirect('/receiptdisplay');
            }
        );
    }
});

app.get('/receiptdisplay', (req, res) => {
    // Fetch the receipts from session and renders it into page
    let receipts = req.session.receipts || [];
    res.render('receiptdisplay', { receipts: receipts });
});
    
// Start the server on the specified port
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);    
});
