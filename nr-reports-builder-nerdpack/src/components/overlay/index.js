import React, { Component } from 'react'
import ReactDOM from 'react-dom'

function createModalRoot() {
  let modalRoot = document.getElementById('modal-root')

  if(!modalRoot) {
    modalRoot = document.createElement('div')
    modalRoot.id = 'modal-root'
    document.body.appendChild(modalRoot)
  }

  return modalRoot
}

export default class OverlayView extends Component {
  constructor(props) {
    super(props)
    this.modalRoot = createModalRoot()
    this.el = document.createElement('div')
  }

  componentDidMount() {
    this.modalRoot.appendChild(this.el)
  }

  componentWillUnmount() {
    this.modalRoot.removeChild(this.el);
  }

  render() {
    const {
      children,
    } = this.props

    return ReactDOM.createPortal(
      <div className='overlay'>
        <div className='overlay-backdrop'></div>
        <div className='overlay-content'>
          { children }
        </div>
      </div>,
      this.el
    );
  }
}
