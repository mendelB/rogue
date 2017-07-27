import React from 'react';
import { keyBy, map, sample, forEach, reject } from 'lodash';
import { RestApiClient } from '@dosomething/gateway';

import { extractPostsFromSignups } from '../../helpers';
import InboxItem from '../InboxItem';
import ModalContainer from '../ModalContainer';
import HistoryModal from '../HistoryModal';
import Confetti from 'react-dom-confetti';

const confettiConfig = {
  angle: 90,
  spread: 90,
  startVelocity: 50,
  elementCount: 70,
  decay: 0.95
};

class CampaignInbox extends React.Component {
  constructor(props) {
    super(props);

    const posts = extractPostsFromSignups(props.signups);
    const batch = Object.keys(posts).slice(0, 5);

    this.state = {
      signups: keyBy(props.signups, 'id'),
      posts: posts,
      batch: batch,
      displayHistoryModal: false,
      historyModalId: null,
      displayGiveMeMore: false,
      shootConfetti: false,
    };

    this.api = new RestApiClient;
    this.updatePost = this.updatePost.bind(this);
    this.updateTag = this.updateTag.bind(this);
    this.updateQuantity = this.updateQuantity.bind(this);
    this.showHistory = this.showHistory.bind(this);
    this.hideHistory = this.hideHistory.bind(this);
    this.deletePost = this.deletePost.bind(this);
    this.loadNextBatch = this.loadNextBatch.bind(this);
  }

  // Open the history modal of the given post
  showHistory(postId, event) {
    event.preventDefault()

    this.setState({
      displayHistoryModal: true,
      historyModalId: postId,
    });
  }

  // Close the open history modal
  hideHistory(event) {
    if (event) {
      event.preventDefault();
    }

    this.setState({
      displayHistoryModal: false,
      historyModalId: null,
    });
  }

  // Updates a post status.
  updatePost(postId, fields) {
    fields.post_id = postId;
    let request = this.api.put('reviews', fields);

    request.then((result) => {
      this.setState((previousState) => {
        const newState = {...previousState};
        newState.posts[postId].status = fields.status;

        // Update new state based on batch status
        this.checkBatch(newState);
        return newState;
      });
    });

  }

  // Tag a post.
  updateTag(postId, tag) {
    const fields = {
      post_id: postId,
      tag_name: tag,
    };

    let response = this.api.post('tags', fields);
    response.then((data) => {
      this.setState((previousState) => {
        const newState = {...previousState};
        const user = newState.posts[postId].user;

        newState.posts[postId] = data;

        // Keep the user from the initial page load.
        newState.posts[postId].user = user;

        return newState;
      });
    });
  }

  // Update a signups quanity.
  updateQuantity(signup, newQuantity) {
    // Fields to send to /posts
    const fields = {
      northstar_id: signup.northstar_id,
      campaign_id: signup.campaign_id,
      campaign_run_id: signup.campaign_run_id,
      quantity: newQuantity,
    };

    // Make API request to Rogue to update the quantity on the backend
    let request = this.api.post('posts', fields);

    request.then((result) => {
      // Update the state
      this.setState((previousState) => {
        const newState = {...previousState};

        newState.signups[signup.id].quantity = result.quantity;

        return newState;
      });
    });

    // Close the modal
    this.hideHistory();
  }

  // Delete a post.
  deletePost(postId, event) {
    event.preventDefault();
    const confirmed = confirm('🚨🔥🚨Are you sure you want to delete this?🚨🔥🚨');

    if (confirmed) {
      // Make API request to Rogue to update the quantity on the backend
      let response = this.api.delete('posts/'.concat(postId));

      response.then((result) => {
        // Update the state
        this.setState((previousState) => {
          var newState = {...previousState};

          // Remove the deleted post from the state
          delete(newState.posts[postId]);

          // Update new state based on batch status
          this.checkBatch(newState);

          // Return the new state
          return newState;
        });
      });
    }
  }

  checkBatch(state) {
    const reviewed = state.batch.every(key => {
      return !state.posts[key] || state.posts[key].status !== 'pending'
    });
    if (reviewed) {
      const pendingPostKeys = this.pendingPostKeys(state.posts);
      if (pendingPostKeys.length > 0) {
        state.displayGiveMeMore = true
      } else {
        state.shootConfetti = true
      }
    } else {
      state.shootConfetti = false
    }
  }

  pendingPostKeys(posts) {
    return reject(Object.keys(posts), key => posts[key].status !== 'pending');
  }

  loadNextBatch() {
    const pendingPostKeys = this.pendingPostKeys(this.state.posts)
    const nextBatch = pendingPostKeys.slice(0, 5)
    this.setState({
      shootConfetti: true,
      batch: nextBatch,
      displayGiveMeMore: false,
    })
  }

  render() {
    const batch = this.state.batch;
    const posts = this.state.posts;
    const campaign = this.props.campaign;

    const nothingHere = [
      'https://media.giphy.com/media/3og0IT9dAZyMz3lXNe/giphy.gif',
      'https://media.giphy.com/media/Lny6Rw04nsOOc/giphy.gif',
      'https://media.giphy.com/media/YdhvjTeL83pNS/giphy.gif',
      'https://media.giphy.com/media/26ufnwz3wDUli7GU0/giphy.gif',
      'https://media.giphy.com/media/lYHbL5QY52Kcw/giphy.gif',
    ];

    if (batch.length !== 0) {
      return (
        <div className="container">

          { batch.map(key => <InboxItem allowReview={true} onUpdate={this.updatePost} onTag={this.updateTag} showHistory={this.showHistory} deletePost={this.deletePost} key={key} details={{post: posts[key], campaign: campaign, signup: this.state.signups[posts[key].signup_id]}} />) }
          { this.state.displayGiveMeMore ? <button onClick={this.loadNextBatch}>Give me more</button> : null }

          <Confetti className="confetti" active={this.state.shootConfetti} config={confettiConfig} />

          <ModalContainer>
            {this.state.displayHistoryModal ? <HistoryModal id={this.state.historyModalId} onUpdate={this.updateQuantity} onClose={e => this.hideHistory(e)} details={{post: posts[this.state.historyModalId], campaign: campaign, signups: this.state.signups }}/> : null}
          </ModalContainer>

        </div>
      )
    } else {
      // @todo - make this into an actual component.
      return (
        <div className="container">
          <h2 className="-padded">No Posts to review!</h2>
          <div className="container">
            <img src={sample(nothingHere)} />
          </div>
        </div>
      )
    }
  }
}

export default CampaignInbox;
