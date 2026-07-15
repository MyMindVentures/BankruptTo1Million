import { describe, it } from 'node:test';

import assert from 'node:assert/strict';

import { readFileSync } from 'node:fs';



const donationsLib = readFileSync(new URL('../src/lib/donations.ts', import.meta.url), 'utf8');

const donationsBlock = readFileSync(new URL('../src/components/journal/JournalDonationsBlock.tsx', import.meta.url), 'utf8');

const donationProviderIcon = readFileSync(new URL('../src/components/journal/DonationProviderIcon.tsx', import.meta.url), 'utf8');

const donationThankYouModal = readFileSync(new URL('../src/components/journal/DonationThankYouModal.tsx', import.meta.url), 'utf8');

const journalPage = readFileSync(new URL('../src/pages/JournalPages.tsx', import.meta.url), 'utf8');

const stripeWebhook = readFileSync(new URL('../supabase/functions/donation-stripe-webhook/index.ts', import.meta.url), 'utf8');

const paypalWebhook = readFileSync(new URL('../supabase/functions/donation-paypal-webhook/index.ts', import.meta.url), 'utf8');
const donationWebhookShared = readFileSync(new URL('../supabase/functions/_shared/donationWebhook.ts', import.meta.url), 'utf8');



describe('journal donations implementation', () => {

  it('loads donation config and intents through Supabase RPCs', () => {

    assert.match(donationsLib, /get_donation_public_config/);

    assert.match(donationsLib, /get_journal_donation_public_stats/);

    assert.match(donationsLib, /get_journal_donation_supporter_thanks/);

    assert.match(donationsLib, /get_donation_public_status/);

    assert.match(donationsLib, /create_donation_intent/);

    assert.match(donationsLib, /supabase\.rpc\('create_donation_intent'/);

  });



  it('tracks pending donations locally and reads return-url donation ids', () => {

    assert.match(donationsLib, /persistPendingDonation/);

    assert.match(donationsLib, /readDonationIdFromUrl/);

    assert.match(donationsLib, /stripDonationQueryParam/);

    assert.match(donationsLib, /donations\.error\.not_found/);

  });



  it('maps donation RPC failures to translation keys', () => {

    assert.match(donationsLib, /donations\.error\.invalid_amount/);

    assert.match(donationsLib, /parseDonationRpcError/);

  });



  it('payment provider icons use official simple-icons brand marks', () => {

    assert.match(donationProviderIcon, /#635BFF/);

    assert.match(donationProviderIcon, /#003087/);

    assert.match(donationProviderIcon, /#9FE870/);

    assert.match(donationProviderIcon, /M13\.976 9\.15/);

    assert.match(donationProviderIcon, /M15\.607 4\.653/);

    assert.match(donationProviderIcon, /M6\.488 7\.469/);

  });



  it('thank-you modal uses translated modal keys and amount interpolation', () => {

    assert.match(donationThankYouModal, /DonationThankYouModal/);

    assert.match(donationThankYouModal, /role="dialog"/);

    assert.match(donationThankYouModal, /donations\.success\.modal\.title/);

    assert.match(donationThankYouModal, /donations\.success\.modal\.body/);

    assert.match(donationThankYouModal, /donations\.success\.modal\.close/);

    assert.match(donationThankYouModal, /amount: formattedAmount/);

  });



  it('donation block uses website i18n and reacts to language', () => {

    assert.match(donationsBlock, /useWebsiteI18n/);

    assert.match(donationsBlock, /isI18nLoading/);

    assert.match(donationsBlock, /language, post\.id\]/);

    assert.match(donationsBlock, /donations\.cta\.support_this_story/);

    assert.match(donationsBlock, /donations\.provider\./);

    assert.match(donationsBlock, /data-i18n-ignore="true"/);

    assert.match(donationsBlock, /DonationProviderIcon/);

    assert.match(donationsBlock, /DonationThankYouModal/);

    assert.match(donationsBlock, /journal-donations__provider-card/);

    assert.match(donationsBlock, /journal-donations__details-grid/);

    assert.match(donationsBlock, /journal-donations__toggle/);

    assert.match(donationsBlock, /donations\.form\.your_details/);

    assert.match(donationsBlock, /donations\.form\.privacy_preferences/);

    assert.match(donationsBlock, /donations\.thanks\.intro/);

    assert.match(donationsBlock, /donations\.thanks\.anonymous_label/);

    assert.match(donationsBlock, /journal-donations__thanks-intro/);

    assert.match(donationsBlock, /getDonationPublicStatus/);

    assert.match(donationsBlock, /readDonationIdFromUrl/);

    assert.match(donationsBlock, /submitState === 'pending'/);

    assert.doesNotMatch(donationsBlock, /submitState === 'success'/);

  });



  it('donation block declares every visible translation key', () => {

    const keys = donationsBlock.match(/JOURNAL_DONATION_TRANSLATION_KEYS = \[([\s\S]*?)\] as const/)?.[1] ?? '';

    for (const key of [

      'donations.cta.support_this_story',

      'donations.cta.choose_amount',

      'donations.cta.custom_amount',

      'donations.cta.continue_to_payment',

      'donations.form.choose_provider',

      'donations.form.your_details',

      'donations.form.privacy_preferences',

      'donations.form.email_label',

      'donations.provider.stripe',

      'donations.provider.paypal',

      'donations.provider.wise',

      'donations.checkout.hosted_pending',

      'donations.success.modal.title',

      'donations.success.modal.body',

      'donations.success.modal.pending',

      'donations.thanks.title',

      'donations.thanks.intro',

      'donations.thanks.anonymous_label',

    ]) {

      assert.match(keys, new RegExp(key.replaceAll('.', '\\.')));

      assert.match(donationsBlock, new RegExp(key.replaceAll('.', '\\.')));

    }

  });



  it('provider webhooks mark donations succeeded through record_donation_provider_event', () => {

    assert.match(stripeWebhook, /markDonationSucceeded/);

    assert.match(paypalWebhook, /markDonationSucceeded/);

    assert.match(donationWebhookShared, /record_donation_provider_event/);

    assert.match(donationWebhookShared, /p_new_status: "succeeded"/);

  });



  it('article page mounts the donation block after share and before comments', () => {

    assert.match(journalPage, /<ShareBlock post=\{post\} \/><JournalDonationsBlock post=\{post\} \/><CommentsBlock post=\{post\} \/>/);

  });

});

