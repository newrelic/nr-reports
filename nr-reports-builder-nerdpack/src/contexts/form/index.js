import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import { RouteContext } from '../route'

export const FormContext = createContext(null)

export class Validator {
  constructor() {
    this.validations = {}
  }

  addValidator(name, validator) {
    this.validations[name] = validator
  }

  removeValidator(name) {
    delete this.validations[name]
  }

  validate(formState) {
    const keys = Object.keys(formState),
      results = {
        valid: true,
        validations: {},
      }

    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index]

      if (this.validations[key]) {
        const result = this.validations[key](formState)

        results.valid = results.valid && !result
        results.validations[`${key}`] = result
      }
    }

    return results
  }
}

export function Validation({ name, validation, children }) {
  const { validator } = useContext(FormContext)

  useMemo(() => {
    validator.addValidator(name, validation)
  }, [])

  return children
}

function FormProvider({ initFormState, children }) {
  const validator = useMemo(() => new Validator(), []),
    {
      params: { formState: subFormState }
    } = useContext(RouteContext),
    prevState = useMemo(() => {
      return subFormState || initFormState()
    }, [subFormState, initFormState]),
    [formState, setFormState] = useState(prevState),
    updateFormState = useCallback((updates, dirty) => {
      const newFormState = {
        ...formState,
        ...updates,
        dirty: formState.dirty || (
          typeof dirty === 'undefined' ? true : dirty
        )
      }

      if (newFormState.dirty) {
        const result = validator.validate(newFormState)

        for (const prop in result) {
          newFormState[prop] = result[prop]
        }
      }

      setFormState(newFormState)
    }, [formState, setFormState, validator]),
    validateFormState = useCallback(onSuccess => {
      const result = validator.validate(formState)

      if (result.valid) {
        onSuccess(formState)
        return
      }

      setFormState({ ...formState, ...result })
    }, [formState, setFormState])

  return (
    <FormContext.Provider value={{
      formState,
      updateFormState,
      validateFormState,
      validator,
    }}>
      {children}
    </FormContext.Provider>
  )
}

export function withFormContext(
  Component,
  initFormState,
) {
  return (
    <FormProvider initFormState={initFormState} >
      {Component}
    </FormProvider>
  )
}
