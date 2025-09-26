Delivery-App-API 

A modular backend API built with Node.js + Express + Prisma + Redis, featuring drivers, jobs, orders, authentication, and idempotent order imports.

#1 install node modules and create a .env

1. installing node modules

npm install

2. create .env with contents:

DATABASE_URL=postgresql://pilotx_db_user:J704usPhP4KkYMopoc5qlBovPJIKSkaz@dpg-d3a3hkjipnbc7399jdp0-a.oregon-postgres.render.com/pilotx_db?sslmode=require
REDIS_URL=rediss://red-d3a3n9idbo4c738h814g:xDB9qCvaRZSDfXQtJJwo5tTterosPHbm@oregon-keyvalue.render.com:6379
API_KEY=supersecret123
JWT_SECRET=change_me
JWT_EXPIRES=7d
CORS_ORIGIN=*

3. Database Setup (Postgres + Prisma)

npx prisma migrate dev
npx prisma generate

npm run migrate:deploy

4. Run Locally

npm run dev

the server will start on http://localhost:4000

5. Deploying to Render

its allredy deployed on render this is the link to render 

https://dilivery-app-api.onrender.com

#2 API Testing with Postman

## after running the server locally on localhost:4000
-go to postman and create a new collection and enviorment for the same
-after creating a collection and enviorment create a http request to start testing

## Tests(can be done both locally and via render using postman)

Set your base

LOCAL: {{BASE}} = http://localhost:4000

RENDER: {{BASE}} = https://dilivery-app-api.onrender.com

1. Health Check
GET http://localhost:4000/
GET http://localhost:4000/healthz
GET http://localhost:4000/healthz/db
GET http://localhost:4000/healthz/redis

2. Auth

will not work without headers and body
Content-Type: application/json
x-api-key: supersecret123
Idempotency-Key: test-ord-1

body should be json(select from the dropdown) 
![alt text](imgs/image2.png)

![alt text](imgs/image.png)


Register

POST http://localhost:4000/api/auth/register
Body:
{
  "email": "test@example.com",
  "name": "Test User",
  "password": "password123"
}

Login

POST http://localhost:4000/api/auth/login
Body:
{
  "email": "test@example.com",
  "password": "password123"
}

Logout

POST http://localhost:4000/api/auth/logout

3. Orders

Import Order

POST http://localhost:4000/api/orders/import-orders
Headers:
x-api-key: supersecret123
Idempotency-Key: test-ord-1
Body:
{
  "platform":"custom",
  "order":{
    "externalId":"ORD-LOCAL-2001",
    "placedAt":"2025-09-24T12:00:00Z",
    "currency":"CAD",
    "totals":{"subtotal":20,"shipping":5,"tax":0,"grand":25},
    "customer":{"name":"Local Tester","email":"test@example.com","phone":"123"},
    "items":[{"sku":"SKU1","name":"Burger","qty":1,"price":20}],
    "job":{"pickupLat":43.653,"pickupLng":-79.383,"dropoffLat":43.645,"dropoffLng":-79.380,"pickupAddress":"123 King St W","dropoffAddress":"200 Front St W"}
  }
}


 !!* IMPORTANT *!! 

 the output from this will have order id you can copy it and paste it in <JOB_ID> tags for testing purposes

!!* IMPORTANT *!! 


4. Driver Heartbeat

POST http://localhost:4000/api/drivers/heartbeat
Headers:

x-api-key: supersecret123
Content-Type: application/json


Body:

{
  "driverId": "d1",
  "name": "Akshit",
  "lat": 43.653,
  "lng": -79.383,
  "status": "available"
}

5. Jobs 

* Jobs Available (by driver’s last heartbeat)

GET http://localhost:4000/api/jobs/available?driverId=d1&radiusKm=5
Headers:

x-api-key: supersecret123

Fallback (explicit lat/lng)

GET http://localhost:4000/api/jobs/available?lat=43.653&lng=-79.383&radiusKm=5
Headers:

x-api-key: supersecret123

* Jobs — Accept

POST http://localhost:4000/api/jobs/<JOB_ID>/accept
Headers:

x-api-key: supersecret123
Content-Type: application/json


Body:

{ "driverId": "d1" }

* Jobs — Status Updates
* Mark PICKED_UP

POST http://localhost:4000/api/jobs/<JOB_ID>/status
Headers:

x-api-key: supersecret123
Content-Type: application/json


Body:

{ "status": "PICKED_UP" }

* Mark DELIVERED

POST http://localhost:4000/api/jobs/<JOB_ID>/status
Headers:

x-api-key: supersecret123
Content-Type: application/json


Body:

{ "status": "DELIVERED" }

* Mark CANCELLED (optional reason)

POST http://localhost:4000/api/jobs/<JOB_ID>/status
Headers:

x-api-key: supersecret123
Content-Type: application/json


Body:

{ "status": "CANCELLED", "reason": "customer no-show" }

* (Optional) Re-ingest Order to Change Pickup/Dropoff

POST http://localhost:4000/api/orders/import-orders
Headers:

x-api-key: supersecret123
Idempotency-Key: ord-update-1
Content-Type: application/json


Body (example change):

{
  "platform": "custom",
  "order": {
    "externalId": "ORD-LOCAL-2001",
    "placedAt": "2025-09-24T12:00:00Z",
    "currency": "CAD",
    "totals": { "subtotal": 20, "shipping": 5, "tax": 0, "grand": 25 },
    "customer": { "name": "Local Tester", "email": "test@example.com", "phone": "123" },
    "items": [{ "sku": "SKU1", "name": "Burger", "qty": 1, "price": 20 }],
    "job": {
      "pickupLat": 43.654,
      "pickupLng": -79.384,
      "dropoffLat": 43.646,
      "dropoffLng": -79.381,
      "pickupAddress": "125 King St W",
      "dropoffAddress": "210 Front St W"
    }
  }
}
