import React from 'react'
import PropTypes from 'prop-types'
import { Stack, StackItem, HeadingText } from 'nr1'
import { Spinner } from 'nr1'

export default function BusyView(props) {
  const { image, heading, message } = props
  return (
    <>
      <Stack
        className="busy-view"
        verticalType={Stack.VERTICAL_TYPE.CENTER}
        horizontalType={Stack.HORIZONTAL_TYPE.CENTER}
        directionType={Stack.DIRECTION_TYPE.VERTICAL}
        gapType={Stack.GAP_TYPE.NONE}
        fullHeight
        fullWidth
      >
        <StackItem>
          <HeadingText type={HeadingText.TYPE.HEADING_3}>
            {heading}
          </HeadingText>
        </StackItem>
        <StackItem>
          <div>
            {
              image ?
              <img src={image} /> :
              <Spinner
                type={Spinner.TYPE.INLINE}
              />
            }
          </div>
        </StackItem>
        <StackItem>
        {
          message &&
            <HeadingText >
              {message}
            </HeadingText>
        }
        </StackItem>
      </Stack>
    </>
  )
}

BusyView.propTypes = {
  image: PropTypes.string,
  heading: PropTypes.string,
  message: PropTypes.string,
}
