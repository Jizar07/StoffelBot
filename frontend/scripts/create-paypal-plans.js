const axios = require('axios')

// Set your credentials here after getting them from PayPal Developer
const PAYPAL_CLIENT_ID = 'AWnO-Ens7YKPa2oLFCiSTtdEX0B9wNVIGWR_ogJSLAiLrh12FWfjU6XGpAUEHcjjciBapmCwRWt41Ykn'
const PAYPAL_CLIENT_SECRET = 'EDHCCIfXm7qtKLLksjJ3hHhgL2tzCSbMp_AJDVYCBpoHDBwbC8cTJNW4f0mwaTXacHlyH2aJEAW0lQcA'
const BASE_URL = 'https://api-m.sandbox.paypal.com' // Change to https://api-m.paypal.com for production

async function getAccessToken() {
  try {
    const response = await axios.post(`${BASE_URL}/v1/oauth2/token`, 
      'grant_type=client_credentials',
      {
        headers: {
          'Accept': 'application/json',
          'Accept-Language': 'en_US',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        auth: {
          username: PAYPAL_CLIENT_ID,
          password: PAYPAL_CLIENT_SECRET
        }
      }
    )
    
    return response.data.access_token
  } catch (error) {
    console.error('Error getting access token:', error.response?.data || error.message)
    throw error
  }
}

async function createSubscriptionPlan(accessToken, planData) {
  try {
    const response = await axios.post(`${BASE_URL}/v1/billing/plans`, planData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Prefer': 'return=representation'
      }
    })
    
    return response.data
  } catch (error) {
    console.error('Error creating plan:', error.response?.data || error.message)
    throw error
  }
}

async function createProduct(accessToken) {
  try {
    const productData = {
      name: 'Stoffel Bot',
      description: 'Discord bot subscription service',
      type: 'SERVICE',
      category: 'SOFTWARE'
    }

    const response = await axios.post(`${BASE_URL}/v1/catalogs/products`, productData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Prefer': 'return=representation'
      }
    })
    
    return response.data.id
  } catch (error) {
    console.error('Error creating product:', error.response?.data || error.message)
    throw error
  }
}

async function main() {
  try {
    console.log('🔑 Getting PayPal access token...')
    const accessToken = await getAccessToken()
    console.log('✅ Access token obtained')

    // Create Product first
    console.log('📦 Creating product...')
    const productId = await createProduct(accessToken)
    console.log('✅ Product created with ID:', productId)

    // Monthly Plan
    console.log('📅 Creating monthly plan...')
    const monthlyPlan = {
      product_id: productId,
      name: 'Stoffel Bot Monthly',
      description: 'Monthly subscription for Stoffel Bot Discord bot',
      status: 'ACTIVE',
      billing_cycles: [
        {
          frequency: {
            interval_unit: 'MONTH',
            interval_count: 1
          },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: {
              value: '6.99',
              currency_code: 'USD'
            }
          }
        }
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3
      },
      taxes: {
        percentage: '0',
        inclusive: false
      }
    }

    const monthlyResult = await createSubscriptionPlan(accessToken, monthlyPlan)
    console.log('✅ Monthly plan created!')
    console.log('📝 Monthly Plan ID:', monthlyResult.id)

    // Yearly Plan  
    console.log('📅 Creating yearly plan...')
    const yearlyPlan = {
      product_id: productId,
      name: 'Stoffel Bot Yearly',
      description: 'Yearly subscription for Stoffel Bot Discord bot (Save 40%)',
      status: 'ACTIVE',
      billing_cycles: [
        {
          frequency: {
            interval_unit: 'YEAR',
            interval_count: 1
          },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: {
              value: '49.99',
              currency_code: 'USD'
            }
          }
        }
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3
      },
      taxes: {
        percentage: '0',
        inclusive: false
      }
    }

    const yearlyResult = await createSubscriptionPlan(accessToken, yearlyPlan)
    console.log('✅ Yearly plan created!')
    console.log('📝 Yearly Plan ID:', yearlyResult.id)

    console.log('\n🎉 SUCCESS! Both plans created!')
    console.log('\n📋 Copy these to your .env.local file:')
    console.log(`NEXT_PUBLIC_PAYPAL_PLAN_ID_MONTHLY=${monthlyResult.id}`)
    console.log(`NEXT_PUBLIC_PAYPAL_PLAN_ID_YEARLY=${yearlyResult.id}`)

  } catch (error) {
    console.error('❌ Script failed:', error.message)
  }
}

main()