import React, { useCallback, useContext, useEffect } from 'react'
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
import {
  accountIdsNotEmptyValidNumbers,
  queryNotEmpty,
} from '../validations'
import { FormContext, Validation } from '../../contexts/form'
import { UI_CONTENT } from '../../constants'

export default function QueryField() {
  const {
      formState,
      dangerouslyUpdateFormState,
      updateFormState,
    } = useContext(FormContext),
    { accountIds, accounts } = formState,
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
    }, [updateFormState]),
    accountMenuLabeler = useCallback((item, index, items) => (
      `${items.length} account${items.length > 1 ? 's' : ''}`
    ), [])

  useEffect(() => {
    if (error) {
      dangerouslyUpdateFormState({ error })
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

      dangerouslyUpdateFormState({
        accountIds: selectedAccounts,
        accounts,
      })
    }
  }, [skip, loading, data, error])

  return (
    <div className="query-field">
      <CustomField
        label={UI_CONTENT.QUERY_FORM.FIELD_LABEL_ACCOUNTS}
      >
        <Validation
          name="accountIds"
          validation={accountIdsNotEmptyValidNumbers}
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
                      showChips={false}
                      icon={Icon.TYPE.INTERFACE__CHEVRON__CHEVRON_BOTTOM}
                      placeholderText={UI_CONTENT.QUERY_FORM.ACCOUNTS_FIELD_PLACEHOLDER}
                      onChange={handleChangeAccounts}
                      invalid={formState.validations?.accountIds}
                      labeler={accountMenuLabeler}
                    />
                  </StackItem>
                )
              }
              </Stack>
            )
          }
        </Validation>
      </CustomField>
      <CustomField
        label={UI_CONTENT.QUERY_FORM.FIELD_LABEL_QUERY}
      >
        <Validation
          name="query"
          validation={queryNotEmpty}
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
                    invalid={formState.validations?.query}
                    onChange={handleChangeQuery}
                  />
                </GridItem>
              </Grid>
            )
          }
        </Validation>
      </CustomField>
    </div>
  )
}
