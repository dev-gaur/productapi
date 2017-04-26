# PRODUCT MGMT API

*A RESTful API to manage your product inventory.*

**HEROKU DEMO** : http://afternoon-basin-91812.herokuapp.com/

####Getting Started :

1. FIll in your environment and database variables in .env file.

2. execute "bash setup.sh". Enter the same details as in .env file for prompts.
	Your app should be running now . If not, Open an issue and let me know.

3. To execute tests, "bash test_this_app.sh" .

#### Stack :
***NodeJS***,  ***MySQL*** ( No framework involved)

Authentication : **JSON Web Tokens**


__header args for every request__ :  username, password, token


***ACCOUNT REGISTRATION***

**Restrictions**

* **Username** : 8 to 14 alphanum characters strictly
* **Password** :  MD5 hash is stored in the database ; Min 8 characters


**POST** /register

_Creating a user account_

* Header arguments :
	* username
	* password

* __Returns__ : Acknowledgement message


***RETRIEVE AUTH TOKEN***

**POST**  /authtoken
_Creating a fresh authentication token. A token is valid till 24 hours from its creation_

* Header arguments :
	* username
	* password

* __Returns__ : Auth token & Acknowledgement message



Copy and store your Auth token in your local storage.

**Token Validity** : 24 hours

<br/>

## Operations

#### ENDPOINT : /api/

Note :  ***Auth token is required for these operations***

In your request header, make sure you include these three(**Mandatory**) :

<big> username, password, authtoken </big>


Note : ***Every product specific transaction is logged.***

<br/>

* LIST ALL BRANDS

	**GET** /api/brands

	* Query parameters :
		* **startpage**
		* **pagesize**

<br/>

* LIST ALL PRODUCTS

	**GET** /api/products

	* Query parameters :
		* **startpage**
		* **pagesize**

<br/>

* SEARCH PRODUCTS

	**GET** /api/products/search

	* Query parameters :
		* **q** (search string)
		* **startpage**
		* **pagesize**


<br/>

_Note_ : **{productcode} must consist 3-7 alphabets followed by 2-4 digits.**

<br/>

* GET PRODUCT

	**GET** /api/product/{productcode}


<br/>

* ADD PRODUCT

	**POST** /api/product/{productcode}

	* Request Body params :

		* **productcode** : unique code id for product
		* **name** : product name (string alphanum + whitespace + hyphen(-) allowed)
     	* **brand** : brand name of your product (string) [ GET /api/brands/  will fetch a list of brands for you.]
        * **stock** : product stock (int)

	Regex for product code : [A-Za-z]{2,6}[0-9]{2,4}
	Regex for product and brand names : [A-Za-z0-9\s]{4,70}

<br/>

* EDIT PRODUCT

	**PUT** /api/product/{productcode}

	* Request Body params :

		* **name** : product name (string alphanum + whitespace + hyphen(-) allowed)
     	* **brand** : brand name of your product (string) [ GET /api/brands/  will fetch a list of brands for you.]
        * **stock** : product stock (int)

<br/>

* ADD PRODUCT STOCK

	**POST** /api/product/{productcode}

	* Request Body params :

		* stock ( int )

<br/>

* DELETE PRODUCT

	***The product's record is NOT deleted from the catalog. Just the stock is emptied***

	**DELETE** /api/product/{productcode}


<br/>

* DELETE PRODUCT STOCK

	**DELETE** /api/product/{productcode}

	* Request Body params :

	 	* stock ( int  how much stock to subtract )




### DATABASE SCHEMA

<br/>

#### user
_user entity_

Attribute 	| Description		| Spl
------------		| ---------  	| ----
id			| User ID.		| Primary Key, Auto_increment
username	| duh.	| Unique
password	| md5 hash of password
token		| authentication token | validity 24 hours
tokenexpiry	| timestamp for token expiry
timcreated	| timestamp for record creation

<br/>

#### brand
_brand entity_

Attribute	| Description		| Spl
------------		| ---------  	| ----
id			| User ID.		| Primary Key, Auto_increment
name	| duh.	| Unique
timecreated	| timestamp for record creation

<br/>

#### product
_product entity_

Attribute	| Description		| Constraints
------------		| ---------  	| ----
id			| User ID.		| Primary Key, Auto_increment
productcode	| identifier for product	| Unique
name		| product name to display |
brand		| Product brand	| Foreign Key => brand(id)
stock		| Product Stock in inventory
timecreated	| timestamp for record creation
timemodified	| timestamp for latest record edit

<br/>

#### operation (READ ONLY)
_Describes all types of operation API provides_

id	| name
----	| ---------
1	| LISTALLBRANDS
2	| GETPRODUCT
3	| EDITPRODUCT
4	| ADDPRODUCT
5	| DELETEPRODUCT
6	| SEARCHPRODUCCT
7	| ADDPRODUCTSTOCK
8	| DELETEPRODUCTSTOCK
9	| LISTALLBRANDS
10	| GETAUTHTOKEN

<br/>

#### transaction
_Logs of all successfull transaction requests_

Attribute | Description | Constraints
----------- | --------------- | ---------------
id	|  | Primary Key, auto_inc
userid	|  | Foreign Key => user(id)
productcode	|  productcode of the requested product resource 	|
operation	|  | Foreign Key => operation(id)
responsecode	| HTTP Response code
comments	| remarks
time	| timestamp of the transaction

