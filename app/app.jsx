import React, {Component} from 'react';
import Global from './Global/component';

export default class App extends Component {
	render() {
		return(
			<div>
				<div id="main">
					<Global />
				</div>
				<div>
					{this.props.children}
				</div>
			</div>
			)
	}

}