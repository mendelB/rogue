import React from 'react';
import { getImageUrlFromProp } from '../../helpers';

class InboxTile extends React.Component {

  render() {
    const post = this.props.details;

    return (
      <li>
        <img src={getImageUrlFromProp(post)}/>
      </li>
    )
  }
}

export default InboxTile;
