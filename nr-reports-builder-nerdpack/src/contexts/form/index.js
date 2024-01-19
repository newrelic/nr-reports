import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

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

  clear() {
    this.validations = {}
  }

  validate(formState, updatedKeys = null) {
    const keys = updatedKeys || Object.keys(formState),
      results = updatedKeys ? {
        valid: typeof formState.valid !== 'undefined' ? formState.valid : true,
        validations: formState.validations || {},
      } : {
        valid : true,
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
    [formState, setFormState] = useState(initFormState()),
    updateFormState = useCallback((updates, onSuccess) => {
      const newFormState = {
          ...formState,
          ...updates,
          dirty: true
        },
        result = validator.validate(newFormState, Object.keys(updates))

      if (result.valid && onSuccess) {
        onSuccess(newFormState)
      }

      setFormState(Object.assign(newFormState, result))
    }, [formState, setFormState, validator]),
    dangerouslyUpdateFormState = useCallback(updates => {
      setFormState({ ...formState, ...updates })
    }, [formState, setFormState]),
    validateFormState = useCallback(onSuccess => {
      const result = validator.validate(formState)

      if (result.valid) {
        onSuccess(formState)
        return
      }

      setFormState({ ...formState, ...result })
    }, [formState, setFormState, validator])

  validator.clear()

  return (
    <FormContext.Provider value={{
      formState,
      updateFormState,
      dangerouslyUpdateFormState,
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
