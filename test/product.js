"use strict";

//During the test the env variable is set to test
process.env.NODE_ENV = 'test';

const mysql = require('mysql');

require('dotenv').config();

//Require the dev-dependencies
let chai = require('chai');
let chaiHttp = require('chai-http');
let server = require('../server');
let should = chai.should();

var test_connection = mysql.createConnection({
        host     : process.env.DBHOST,
        user     : process.env.DBUSER,
        password : process.env.DBPASS,
        database : process.env.TESTDBDATABASE
    });

test_connection.connect();

chai.use(chaiHttp);

//Our parent block
describe('TESTING product API', () => {
	beforeEach((done) => { //Before each test we empty the database
		done();
	});

 /*
  * Test the GETPRODUCTLIST route
  */
  describe('GET /api/products STARTPAGE= 0 (DEFAULT) PAGESIZE = 5', () => {
	  it('it should GET all the products', (done) => {
			chai.request(server)
		    .get('/api/products?pagesize=5')
		    .end((err, res) => {
				if (err) {
				}

				res.body.should.be.a('object');
			  	res.should.have.status(200);
			  	res.body['products'].should.be.a('array');
			  	res.body['products'].length.should.be.eql(5);
		      done();
		    });
	  });
  });

  describe('GET /api/products DEFAULT STARTPAGE=0 (DEFAULT) & PAGESIZE=10 (DEFAULT)', () => {
	  it('it should GET all the products', (done) => {
			chai.request(server)
		    .get('/api/products')
		    .end((err, res) => {
				if (err) {
				}

				res.body.should.be.a('object');
			  	res.should.have.status(200);
			  	res.body['products'].should.be.a('array');
			  	res.body['products'].length.should.be.eql(6);
		      done();
		    });
	  });
  });

  describe('GET /api/products STARTPAGE = 2 PAGESIZE = 10 ', () => {
	  it('it should GET all the products', (done) => {
			chai.request(server)
		    .get('/api/products?startpage=2&pagesize=10')
		    .end((err, res) => {
				if (err) {
				}

			  	res.should.have.status(200);
				res.body.should.be.a('object');
			  	res.body['products'].should.be.a('array');
			  	res.body['products'].length.should.be.eql(0);
		      done();
		    });
	  });
  });


 /*
  * Test the GET BRANDLIST route
  */
	describe('GET /api/brands STARTPAGE= 0 (DEFAULT) PAGESIZE = 3', () => {
	  it('it should GET all the products', (done) => {
			chai.request(server)
		    .get('/api/brands?pagesize=3')
		    .end((err, res) => {
				if (err) {
				}

				res.body.should.be.a('object');
			  	res.should.have.status(200);
			  	res.body['products'].should.be.a('array');
			  	res.body['products'].length.should.be.eql(3);
		      done();
		    });
	  });
  	});

  	describe('GET /api/brands DEFAULT STARTPAGE=0 (DEFAULT) & PAGESIZE=10 (DEFAULT)', () => {
	  	it('it should GET all the products', (done) => {
			chai.request(server)
		    .get('/api/brands')
		    .end((err, res) => {
				if (err) {
				}

			  	res.should.have.status(200);
				res.body.should.be.a('object');
			  	res.body['products'].should.be.a('array');
			  	res.body['products'].length.should.be.eql(5);
		      	done();
			});
		});
  	});

  describe('GET /api/brands STARTPAGE = 2 PAGESIZE = 10 ', () => {
	  it('it should GET all the products', (done) => {
			chai.request(server)
		    .get('/api/brands?startpage=2&pagesize=10')
		    .end((err, res) => {
				if (err) {
				}

			  	res.should.have.status(200);
				res.body.should.be.a('object');
			  	res.body['products'].should.be.a('array');
			  	res.body['products'].length.should.be.eql(0);
		      done();
		    });
	  });
  });

  /*
   *	TESTING GET PRODUCT/{productcode} route
   */
    describe('GET /api/product/hawai120', () => {
	  it('it should GET all the products', (done) => {
			chai.request(server)
		    .get('/api/product/hawai120')
		    .end((err, res) => {
				if (err) {
				}

				res.body.should.be.a('object');
			  	res.should.have.status(200);
			  	res.body.product.productcode.should.be.eql('hawai120');
				res.body.product
		      done();
		    });
	  });
  });

  describe('GET /product/wrong124', () => {
	  it('it should GET all the products', (done) => {
			chai.request(server)
		    .get('/api/product/wrong124')
		    .end((err, res) => {
				if (err) {
				}

				res.body.should.be.a('object');
			  	res.should.have.status(404);
		      done();
		    });
	  });
  });


  /*
   *	TESTING GET PRODUCT/PRODUCT/SEARCH?q=xxxx route
   */
    describe('GET /api/product/search?q=hawai120', () => {
	  it('it should GET all the products', (done) => {
			chai.request(server)
		    .get('/api/products/search')
		    .end((err, res) => {
				if (err) {

				}
				res.body.should.be.a('object');
			  	res.should.have.status(400);
		      done();
		    });
	  });
  });

  describe('GET /product/search?q=wrong124', () => {
	  it('it should GET all the products', (done) => {
			chai.request(server)
		    .get('/api/products/search?q=wrong124')
		    .end((err, res) => {
				if (err) {
				}

				res.body.should.be.a('object');
			  	res.should.have.status(404);
		      done();
		    });
	  });
  });

  describe('GET /product/search?q=adi', () => {
	  it('it should GET all the products', (done) => {
			chai.request(server)
		    .get('/api/products/search?q=adi')
		    .end((err, res) => {
				if (err) {
				}

				res.body.should.be.a('object');
			  	res.should.have.status(200);
		      done();
		    });
	  });
  });

 /*
  * Test Invalid /POST Request to ADD PRODUCT route
  */
  describe('/POST /products', () => {
	it('it should not POST a product because "brand" field is missing', (done) => {

	  	let pro_name = "test title 123";
		let pro_code = "title123";
		let pro_stock = 50;

		let product = {
	  		name : pro_name,
	  		code : pro_code,
			stock : pro_stock
	  	}

		chai.request(server)
	    .post('/api/products')
		.set('Content-Type', 'application/x-www-form-urlencoded')
	    .send(product)
		.end((err, res) => {

			res.should.have.status(400);
		  	res.body.should.be.a('object');

			done();
		});
	});
  });

 /*
  * Test the /POST ADD PRODUCT route
  */
  describe('/POST /products', () => {
	it('it should POST a product', (done) => {

	  	let pro_name = "test title 123";
		let pro_code = "title123";
		let pro_brand = "nike";
		let pro_stock = 50;

		let product = {
	  		name : pro_name,
	  		code : pro_code,
	  		brand : pro_brand,
			stock : pro_stock
	  	}

		chai.request(server)
	    .post('/api/products')
		.set('Content-Type', 'application/x-www-form-urlencoded')
	    .send(product)
		.end((err, res) => {

			res.should.have.status(200);
		  	res.body.should.be.a('object');
		  	res.body.product.should.have.property('code').eql(pro_code);
		  	res.body.product.should.have.property('name').eql(pro_name);
			res.body.product.should.have.property('brand').eql(pro_brand);
			res.body.product.should.have.property('stock').eql(pro_stock);

			var sql = "SELECT productcode, product.name, brand.name as brandname, stock FROM product JOIN brand ON product.brand = brand.id WHERE productcode = ?";
			test_connection.query({
				sql : sql,
				values : [pro_code]
			},
			function(err, rows){

				rows[0].productcode.should.be.eql(pro_code);
				rows[0].name.should.be.eql(pro_name);
				rows[0].brandname.toLowerCase().should.be.eql(pro_brand.toLowerCase());
				rows[0].stock.should.be.eql(pro_stock);

				done();
			});
		});
	});
  });

 /*
  * Test the /POST ADD PRODUCT REQUEST for An EXISTING PRODUCTCODE route
  */
  describe('/POST /products', () => {
	it('it should not POST a product as PRODUCT CODE ALREADY EXISTS', (done) => {

	  	let pro_name = "test title2 123";
		let pro_code = "title123";
		let pro_brand = "adidas";
		let pro_stock = 50;

		let product = {
	  		name : pro_name,
	  		code : pro_code,
	  		brand : pro_brand,
			stock : pro_stock
	  	}

		chai.request(server)
	    .post('/api/products')
		.set('Content-Type', 'application/x-www-form-urlencoded')
	    .send(product)
		.end((err, res) => {

			res.should.have.status(400);
		  	res.body.should.be.a('object');

			done();
		});
	});
  });


 /*
  * Test the /POST ADD PRODUCT STOCK route
  */
  describe('/POST /api/product ADDPRODUCTSTOCK', () => {
	it('it should Add up to the stock of a product', (done) => {

		// INITIAL STOCK for Product "title123" was 50.
		let pro_code = "title123";
		let pro_stock = 10;

		let product = {
			stock : pro_stock
	  	}

		chai.request(server)
	    .post('/api/product/' + pro_code)
		.set('Content-Type', 'application/x-www-form-urlencoded')
	    .send(product)
		.end((err, res) => {

			res.should.have.status(200);
		  	res.body.should.be.a('object');

			var sql = "SELECT productcode, stock FROM product WHERE productcode = ?";

			test_connection.query({
				sql : sql,
				values : [pro_code]
			},
			function(err, rows){

				rows[0].productcode.should.be.eql(pro_code);
				// INITIAL STOCK for Product "title123" was 50.
				rows[0].stock.should.be.eql(50 + parseInt(pro_stock));

				done();
			});
		});
	});
  });


 /*
  * Test the /PUT EDIT PRODUCT route
  */
  describe('/PUT /api/product EDIT PRODUCT', () => {
	it('It should edit a product', (done) => {

		// INITIAL STOCK for Product "title123" was 50.
		let pro_code = "title123";
		let pro_stock = 10;
		let pro_name = "New Test Name";
		let pro_brand = "BATA";

		let product = {
			stock : pro_stock,
			name : pro_name,
			brand : pro_brand
	  	};

		chai.request(server)
	    .put('/api/product/' + pro_code)
		.set('Content-Type', 'application/x-www-form-urlencoded')
	    .send(product)
		.end((err, res) => {

			res.should.have.status(200);
		  	res.body.should.be.a('object');

			var sql = "SELECT productcode, product.name, brand.name as brandname, stock FROM product JOIN brand ON product.brand = brand.id WHERE productcode = ?";
			test_connection.query({
				sql : sql,
				values : [pro_code]
			},
			function(err, rows){

				rows[0].productcode.should.be.eql(pro_code);
				rows[0].name.should.be.eql(pro_name);
				rows[0].brandname.toLowerCase().should.be.eql(pro_brand.toLowerCase());
				rows[0].stock.should.be.eql(pro_stock);

				done();
			});
		});
	});
  });


 /*
  * Test the /DELETE Delete Product Stock route
  * The stock value of product title123 is 10 currently.
  */
  describe('/DELETE /api/product/{productcode} DELETE/TRUNCATE/WIPE OFF PRODUCT STOCK', () => {
	it('It should wipe off all the stock of a product', (done) => {

		// INITIAL STOCK for Product "title123" was 50.
		let pro_code = "title123";
		let pro_stock = 5;

		let product = {
			stock : pro_stock,
	  	};

		chai.request(server)
	    .delete('/api/product/' + pro_code)
		.set('Content-Type', 'application/x-www-form-urlencoded')
	    .send(product)
		.end((err, res) => {

			res.should.have.status(200);
		  	res.body.should.be.a('object');

			var sql = "SELECT stock FROM product JOIN brand ON product.brand = brand.id WHERE productcode = ?";
			test_connection.query({
				sql : sql,
				values : [pro_code]
			},
			function(err, rows){
				console.log(err);
				console.log(rows);

				rows[0].stock.should.be.eql(5);

				done();
			});
		});
	});
  });

 /*
  * Test the /DELETE Product route
  */
  describe('/DELETE /api/product/{productcode} DELETE PRODUCT', () => {
	it('It should delete a product', (done) => {

		// INITIAL STOCK for Product "title123" was 50.
		let pro_code = "title123";

		chai.request(server)
	    .delete('/api/product/' + pro_code)
		.end((err, res) => {

			res.should.have.status(200);
		  	res.body.should.be.a('object');

			var sql = "SELECT count(*) FROM product WHERE productcode = ?";
			test_connection.query({
				sql : sql,
				values : [pro_code]
			},
			function(err, rows){
				rows[0]['count(*)'].should.be.eql(0);
				done();
			});
		});
	});
  });

 /*
  * Test the /DELETE Product route
  */
  describe('/DELETE /api/product/{productcode} DELETE PRODUCT', () => {
	it('It should return a 404. The product is absent in records.', (done) => {

		// INITIAL STOCK for Product "title123" was 50.
		let pro_code = "title123";

		chai.request(server)
	    .delete('/api/product/' + pro_code)
		.end((err, res) => {

			res.should.have.status(404);
		  	res.body.should.be.a('object');

			done();
		});
	});
  });

});
