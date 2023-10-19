import React from 'react'
import PropTypes from 'prop-types'
import {
  Stack,
  StackItem,
  HeadingText,
  BlockText,
  Icon,
} from 'nr1'

const ErrorList = props => {
  let errors = props.errors

  if (!Array.isArray(errors)) {
    errors = [errors]
  }

  return (
    <div className='errors'>
      {
        errors.map((err, index) => {
          return (
            <div className='error-container' key={`error-${index}`}>
              <div className='error-body-header'>
                <Icon type={Icon.TYPE.INTERFACE__STATE__CRITICAL} color="#bf0015" />
                <h5 className={'error-title'}>
                  {
                    err.name ? `${err.name}: ${err.message}` : err.message
                  }
                </h5>
              </div>
            </div>
          )
        })
      }
    </div>
  )
}

export default function ErrorView(props) {
  const { image, heading, description, error } = props
  return (
    <>
      <Stack
        className="error-view"
        verticalType={Stack.VERTICAL_TYPE.CENTER}
        horizontalType={Stack.HORIZONTAL_TYPE.CENTER}
        directionType={Stack.DIRECTION_TYPE.VERTICAL}
        gapType={Stack.GAP_TYPE.NONE}
        fullHeight
        fullWidth
      >
        {
          image &&
          <StackItem>
            <img src={image} />
          </StackItem>
        }
        <StackItem>
          <HeadingText
            type={HeadingText.TYPE.HEADING_2}
            tagType={HeadingText.TAG_TYPE.H2}
          >
            {
              heading ||
              <>Ooops! Something happened that we weren&lsquo;t expecting.</>
            }
          </HeadingText>
        </StackItem>
        <StackItem>
          <BlockText type={BlockText.TYPE.PARAGRAPH}>
            {
              description ||
              <>One or more fatal application errors occurred. The application could not continue.</>
            }
          </BlockText>
        </StackItem>
        {
          error && (
            <StackItem className="error-list">
              <HeadingText
                type={HeadingText.TYPE.HEADING_3}
                tagType={HeadingText.TAG_TYPE.H3}
              >
                Errors
              </HeadingText>
              <ErrorList errors={error.cause || error} />
            </StackItem>
          )
        }
      </Stack>
    </>
  )
}

ErrorView.propTypes = {
  error: PropTypes.object,
  image: PropTypes.string,
  heading: PropTypes.string,
  description: PropTypes.string,
}
