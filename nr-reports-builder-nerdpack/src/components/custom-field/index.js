import {
  TextField,
} from 'nr1'

export default function CustomField({ className, label, children }) {
  return (
    <div className={`custom-field ${className || ''}`}>
      <TextField
        label={label}
        className="hidden-field"
        disabled
        value={''}
      />
      { children }
    </div>
  )
}
