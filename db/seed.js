const db = require('APP/db')

const seedUsers = () => db.Promise.map([
  {first_name: 'Batman', last_name: 'Batman', email: 'batman@batman.com', password: '1234', photoUrl: 'https://scontent-lga3-1.xx.fbcdn.net/v/t1.0-9/15232247_1369916919705242_553294859913870772_n.jpg?oh=12a9264cccdf47197e8b040ff2efd2ed&oe=58D5DCB8'},
  {first_name: 'Spiderman', last_name: 'Spiderman', email: 'spiderman@spiderman.com', password: '1234', photoUrl: 'https://scontent-lga3-1.xx.fbcdn.net/v/t1.0-9/1625605_965823056826938_5514262066118510822_n.jpg?oh=58ce5f47fa29b50eb37779ddef6fb26d&oe=591C5CC4'},
  {first_name: 'Captain', last_name: 'America', email: 'captain@america.com', password: '1234', photoUrl: 'https://scontent-lga3-1.xx.fbcdn.net/v/t1.0-9/13221715_948450675252971_5785754447567564597_n.png?oh=e8b9d27550de7ada9a2b9135c1b7e362&oe=590E6307'},
  {first_name: 'Zurk', last_name: 'Beast', email: 'zurk@beast.com', password: '1234', photoUrl: 'https://scontent-lga3-1.xx.fbcdn.net/v/t1.0-9/10473806_10152558480353412_8202563348537802101_n.jpg?oh=ee0b52146eec264d58530341f220187c&oe=590548B9'},
  {first_name: 'The', last_name: 'Joker', email: 'the@joker.com', password: '1234', photoUrl: 'https://scontent-lga3-1.xx.fbcdn.net/v/t1.0-9/15230627_834040286736590_4525147311394853261_n.jpg?oh=84154b815509ab7c4c59ad3a2c0ba021&oe=5906B34E'},
  {first_name: 'Brad', last_name: 'Pitt', email: 'brad@pitt.com', password: '1234', photoUrl: 'https://external-lga3-1.xx.fbcdn.net/safe_image.php?d=AQCOLCxkbbDVcbjV&w=264&h=264&url=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F3%2F3b%2FBrad_Pitt_2012.jpg%2F720px-Brad_Pitt_2012.jpg&colorbox&f&_nc_hash=AQAIpDkRITQN-c7c'},
  {first_name: 'Derek', last_name: 'Jeter', email: 'derek@jeter.com', password: '1234', photoUrl: 'https://scontent-lga3-1.xx.fbcdn.net/v/t1.0-9/294843_236503463067941_70607826_n.jpg?oh=01395416f9ecc13777aadd2e59504832&oe=5906811D'},
  {first_name: 'Big', last_name: 'Bird', email: 'big@bird.com', password: '1234', photoUrl: 'https://scontent-lga3-1.xx.fbcdn.net/v/t1.0-9/13237647_1214329998579976_517185168738381310_n.jpg?oh=285f0f56980ba692969a3caef8edd106&oe=591987EB'},
  {first_name: 'Snoopy', last_name: 'Brown', email: 'snoopy@brown.com', password: '1234', photoUrl: 'https://scontent-lga3-1.xx.fbcdn.net/v/t1.0-9/15338667_1430037040380381_1451508586760350414_n.png?oh=abc923e3001f188608acf87e53e3dab0&oe=5914189E'},
  {first_name: 'Woodstock', last_name: 'Bird', email: 'woodstock@bird.com', password: '1234', photoUrl: 'https://scontent-lga3-1.xx.fbcdn.net/v/t31.0-8/13220764_1220961037954650_4469782399849684647_o.jpg?oh=e3952f50682db3f4bb0edab84015880d&oe=590CF06B'},
  {first_name: 'Charlie', last_name: 'Brown', email: 'charlie@brown.com.com', password: '1234', photoUrl: 'https://scontent-lga3-1.xx.fbcdn.net/v/t31.0-8/15391325_1434892463228172_1922141800997069794_o.jpg?oh=d9f9dece296209bcc1ef77b2e4196389&oe=5914F8D1'},
], user => db.model('users').create(user))

db.didSync
  .then(() => db.sync({force: true}))
  .then(seedUsers)
  .then(users => console.log(`Seeded ${users.length} users OK`))
  .catch(error => console.error(error))    
  .finally(() => db.close())
