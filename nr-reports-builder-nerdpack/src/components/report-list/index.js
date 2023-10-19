import React from 'react';
import PropTypes from 'prop-types';
import { Button, HeadingText, Stack, StackItem } from 'nr1';
import { UI_CONTENT } from '../../constants';

export default function ReportList(props) {
  const {
    manifest,
    onSelectReport,
  } = props

  return (
    <>
      <Stack
        className="report-list"
        directionType={Stack.DIRECTION_TYPE.VERTICAL}
        fullWidth
        fullHeight
      >
        <StackItem>
          <HeadingText type={HeadingText.TYPE.HEADING_2}>
            { UI_CONTENT.REPORT_LIST.HEADING }
          </HeadingText>
        </StackItem>
        <StackItem>
          <Stack
            directionType={Stack.DIRECTION_TYPE.VERTICAL}
            fullWidth
            fullHeight
          >
            {
              manifest && manifest.reports.length > 0 ? (
                manifest.reports.map((r, i) => (
                  <StackItem key={`report-${i}-${r.name}`}>
                    <HeadingText>
                      <Button onClick={() => onSelectReport(i)}>{r.name}</Button>
                    </HeadingText>
                  </StackItem>
                ))
              ) : (
                <p>No reports</p>
              )
            }
          </Stack>
        </StackItem>
      </Stack>
    </>
  )
}

ReportList.propTypes = {
  manifest: PropTypes.object,
};
