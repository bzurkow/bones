
import { browserHistory, Router } from 'react-router';
import axios from 'axios';

const UPDATED = 'UPDATED_USER';
const updated = user  => ({ type: UPDATED, user });

const CREATED = 'CREATED_USER';
const created = user => ({type: CREATED, user})

const reducer = (state=null, action) => {
	console.log(action)
	switch(action.type) {
		case CREATED:
			return action.user
	}
	return state
}

export const create = (email, password, first_name, last_name, photoUrl) => {
	return dispatch => {
		console.log('hitting inside dispatch inside create')
		return(
		axios.post('api/users', { email, password, first_name, last_name, photoUrl })
		.then(res => res.data)
		.then(user => dispatch(created(user)))
		.catch(failed => dispatch(created(null)))
		)
	}
}

export default reducer