const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY!

interface CreateInvoiceParams {
  externalId: string
  amount: number
  payerEmail: string
  description: string
  successRedirectUrl: string
  failureRedirectUrl: string
}

interface XenditInvoice {
  id: string
  external_id: string
  user_id: string
  status: string
  merchant_name: string
  merchant_profile_picture_url: string
  amount: number
  payer_email: string
  description: string
  expiry_date: string
  invoice_url: string
  available_banks: Array<{ bank_code: string; collection_type: string }>
  available_retail_outlets: Array<{ retail_outlet_name: string }>
  available_ewallets: Array<{ ewallet_type: string }>
  should_exclude_credit_card: boolean
  should_send_email: boolean
  created: string
  updated: string
  currency: string
}

export async function createInvoice(params: CreateInvoiceParams): Promise<XenditInvoice> {
  const response = await fetch('https://api.xendit.co/v2/invoices', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(XENDIT_SECRET_KEY + ':').toString('base64')}`,
    },
    body: JSON.stringify({
      external_id: params.externalId,
      amount: params.amount,
      payer_email: params.payerEmail,
      description: params.description,
      success_redirect_url: params.successRedirectUrl,
      failure_redirect_url: params.failureRedirectUrl,
      currency: 'IDR',
      invoice_duration: 86400, // 24 hours
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to create invoice')
  }

  return response.json()
}

export function verifyWebhookToken(token: string): boolean {
  return token === process.env.XENDIT_WEBHOOK_TOKEN
}
