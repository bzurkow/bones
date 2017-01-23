
import { browserHistory, Router } from 'react-router';
import axios from 'axios'



// constants and their action creators:
// sets logged in user on state as auth
const AUTHENTICATED = 'AUTHENTICATED'
export const authenticated = user => ({
  type: AUTHENTICATED, user
})

// removes logged out user as auth
const LOGOUT_USER = 'LOGOUT_USER'
export const logout_user =  user => ({
  type: LOGOUT_USER, user
})



const reducer = (state=null, action) => {
  switch(action.type) {
  case AUTHENTICATED:
    return action.user  
  }
  return state
}

export const facebookLogin = () => {
  console.log("hitting pre dispatch")
  return dispatch => 
    axios.get('/api/auth/facebook')
  
}

export const login = (username, password) =>
  dispatch =>
    axios.post('/api/auth/local/login',
      {username, password})
      .then(() => dispatch(whoami()))
      .then(() => browserHistory.push('/home'))
      .catch(() => dispatch(whoami()))      

export const logout = () =>
  dispatch =>
    axios.post('/api/auth/logout')
      .then(() => dispatch(whoami()))
      .then(() => browserHistory.push('/home'))
      .catch(() => dispatch(whoami()))

export const whoami = () =>
  dispatch =>
    axios.get('/api/auth/whoami')
      .then(response => {
        const user = response.data
        dispatch(authenticated(user))
      })
      .catch(failed => dispatch(authenticated(null)))


export default reducer
