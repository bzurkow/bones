const db = require('APP/db')

const seedUsers = () => db.Promise.map([
  {first_name: 'Batman', last_name: 'Batman', email: 'batman@batman.com', password: '1234'},
  {first_name: 'Spiderman', last_name: 'Spiderman', email: 'spiderman@spiderman.com', password: '1234'},
  {first_name: 'Captain', last_name: 'America', email: 'captain@america.com', password: '1234'},
  {first_name: 'Zurk', last_name: 'Beast', email: 'zurk@beast.com', password: '1234'},
  {first_name: 'The', last_name: 'Joker', email: 'the@joker.com', password: '1234'},
  {first_name: 'Brad', last_name: 'Pitt', email: 'brad@pitt.com', password: '1234'},
  {first_name: 'Derek', last_name: 'Jeter', email: 'derek@jeter.com', password: '1234'},
  {first_name: 'Big', last_name: 'Bird', email: 'big@bird.com', password: '1234'},
], user => db.model('users').create(user))

db.didSync
  .then(() => db.sync({force: true}))
  .then(seedUsers)
  .then(users => console.log(`Seeded ${users.length} users OK`))
  .catch(error => console.error(error))    
  .finally(() => db.close())
