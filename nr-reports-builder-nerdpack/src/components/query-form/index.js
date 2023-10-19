import React, { useCallback, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import {
  useAccountsQuery,
  Grid,
  GridItem,
  Icon,
  Spinner,
  Stack,
  StackItem,
} from 'nr1'
import MultiSelect2 from '../multi-select-2'
import CustomField from '../custom-field'
import NrqlEditor2 from '../nrql-editor-2'
import { UI_CONTENT } from '../../constants'

export default function QueryForm({
  formState,
  updateFormState,
}) {
  const { accountIds, accounts } = formState,
    skip = formState.accounts ? true : false,
    {
      loading,
      data,
      error,
    } = useAccountsQuery({
      skip,
    }),
    handleChangeAccounts = useCallback(items => {
      updateFormState({ accountIds: items })
    }, [updateFormState]),
    handleChangeQuery = useCallback(e => {
      updateFormState({ query: e.target.value })
    }, [updateFormState])

  useEffect(() => {
    if (error) {
      updateFormState({ error }, false)
      return
    }

    if (!skip && !loading && !error && data) {
      const selectedAccounts = [],
        accounts = data.map(a => {
          const account = {
            value: a.id,
            label: `${a.name} - ${a.id}`,
          }

          if (accountIds && accountIds.findIndex(id => id === a.id) !== -1) {
            selectedAccounts.push(account)
          }

          return account
        })

      updateFormState({
        accountIds: selectedAccounts,
        accounts,
      }, false)
    }
  }, [skip, loading, data, error])

  return (
    <div className="query-form">
      <CustomField
        label={UI_CONTENT.QUERY_FORM.FIELD_LABEL_ACCOUNTS}
      >
        {
          loading ? (
            <Spinner />
          ) : (
            <Stack
              directionType={Stack.DIRECTION_TYPE.VERTICAL}
              className="accounts"
            >
            {
              accounts && (
                <StackItem className="accounts-multiselect">
                  <MultiSelect2
                    items={accounts}
                    value={accountIds}
                    icon={Icon.TYPE.INTERFACE__CHEVRON__CHEVRON_BOTTOM__V_ALTERNATE}
                    placeholderText={UI_CONTENT.QUERY_FORM.ACCOUNTS_FIELD_PLACEHOLDER}
                    onChange={handleChangeAccounts}
                  />
                </StackItem>
              )
            }
            </Stack>
          )
        }
      </CustomField>
      <CustomField
        label={UI_CONTENT.QUERY_FORM.FIELD_LABEL_QUERY}
      >
        {
          loading ? (
            <Spinner />
          ) : (
            <Grid
            >
              <GridItem columnSpan={12}>
                <NrqlEditor2
                  nrql={formState.query || ''}
                  onChange={handleChangeQuery}
                />
              </GridItem>
            </Grid>
          )
        }
      </CustomField>
    </div>
  )
}
