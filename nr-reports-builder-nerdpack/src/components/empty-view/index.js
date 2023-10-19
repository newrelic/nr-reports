import React from 'react';
import PropTypes from 'prop-types';
import { Stack, StackItem, HeadingText, BlockText } from 'nr1';

export default function EmptyView(props) {
  const { image, heading, description } = props

  return (
    <>
      <Stack
        className="empty-view"
        verticalType={Stack.VERTICAL_TYPE.CENTER}
        horizontalType={Stack.HORIZONTAL_TYPE.CENTER}
        directionType={Stack.DIRECTION_TYPE.VERTICAL}
        gapType={Stack.GAP_TYPE.NONE}
        fullWidth
        fullHeight
      >
        {
          image &&
          <StackItem>
            <img src={image} />
          </StackItem>
        }
        <StackItem>
          <HeadingText>
            {heading}
          </HeadingText>
        </StackItem>
        <StackItem>
          <BlockText type={BlockText.TYPE.PARAGRAPH}>
            {description}
          </BlockText>
        </StackItem>
      </Stack>
    </>
  )
}

EmptyView.propTypes = {
  image: PropTypes.string,
  heading: PropTypes.string,
  description: PropTypes.string
};
