import React, { Component } from 'react';
import { Route, withRouter } from 'react-router';

class Refresh extends Component {
  componentWillMount() {
    const { history, location, match } = this.props;
    history.replace({
      ...location,
      pathname: location.pathname.substring(match.path.length),
    });
  }
  render() {
    const { path } = this.props;
    return <Route path={path} render={() => null} />;
  }
}

export default withRouter(Refresh);
