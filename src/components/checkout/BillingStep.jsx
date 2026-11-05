import { TextField, Select, Icon } from '@/design-system'
import { countries } from '@/data/checkout.js'
import StepCard from './StepCard.jsx'

// Billing details for the receipt and invoice PDF. The name comes from the account (AccountStep).
export default function BillingStep({ field, form, set }) {
  return (
    <StepCard id="co-billing" title="Billing" intro="These go on your receipt and invoice, with the name on your account.">
      <Select label="Country" placeholder="Choose a country" options={countries} autoComplete="country-name" {...field('country')} />
      <TextField label="Address" optional autoComplete="street-address" {...field('address')} />
      {form.showCompany ? (
        <div className="pg-grid-2 co-pair">
          <TextField label="Company" optional autoComplete="organization" {...field('company')} />
          <TextField label="Tax ID" optional hint="Shown on your invoice, e.g. a VAT number." {...field('taxId')} />
        </div>
      ) : (
        <button type="button" className="sg-linkbtn co-start co-add" aria-expanded="false" onClick={() => set('showCompany', true)}>
          <Icon name="plus" size={16} />Add company details
        </button>
      )}
    </StepCard>
  )
}
