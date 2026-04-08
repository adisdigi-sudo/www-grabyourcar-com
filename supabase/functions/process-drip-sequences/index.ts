import { corsHeaders } from '@supabase/supabase-js/cors';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get active sequences
    const { data: sequences } = await supabase
      .from('email_sequences')
      .select('*')
      .eq('is_active', true);

    if (!sequences || sequences.length === 0) {
      return new Response(JSON.stringify({ message: 'No active sequences' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let processed = 0;
    let sent = 0;

    for (const seq of sequences) {
      // Get enrollments that are due
      const { data: enrollments } = await supabase
        .from('email_drip_enrollments')
        .select('*')
        .eq('sequence_id', seq.id)
        .eq('status', 'active')
        .lte('next_send_at', new Date().toISOString());

      if (!enrollments || enrollments.length === 0) continue;

      // Get sequence steps
      const { data: steps } = await supabase
        .from('email_sequence_steps')
        .select('*')
        .eq('sequence_id', seq.id)
        .eq('is_active', true)
        .order('step_order');

      if (!steps || steps.length === 0) continue;

      for (const enrollment of enrollments) {
        processed++;
        const currentStep = steps[enrollment.current_step_index];
        if (!currentStep) {
          // All steps completed
          await supabase
            .from('email_drip_enrollments')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', enrollment.id);
          continue;
        }

        // Get subscriber
        const { data: subscriber } = await supabase
          .from('email_subscribers')
          .select('*')
          .eq('id', enrollment.subscriber_id)
          .single();

        if (!subscriber || subscriber.subscribed === false) {
          await supabase
            .from('email_drip_enrollments')
            .update({ status: 'unsubscribed' })
            .eq('id', enrollment.id);
          continue;
        }

        // Get template
        const { data: template } = await supabase
          .from('email_templates')
          .select('*')
          .eq('id', currentStep.template_id)
          .single();

        if (!template) continue;

        // Send via send-bulk-email or directly log
        const { error: logError } = await supabase.from('email_logs').insert({
          recipient_email: subscriber.email,
          recipient_name: subscriber.name,
          subject: template.subject,
          template_id: template.id,
          sequence_id: seq.id,
          status: 'pending',
        });

        if (!logError) sent++;

        // Calculate next step
        const nextStepIndex = enrollment.current_step_index + 1;
        const nextStep = steps[nextStepIndex];
        
        if (nextStep) {
          const delayMs = ((nextStep.delay_days || 0) * 86400 + (nextStep.delay_hours || 0) * 3600) * 1000;
          const nextSendAt = new Date(Date.now() + delayMs).toISOString();
          
          await supabase
            .from('email_drip_enrollments')
            .update({ current_step_index: nextStepIndex, next_send_at: nextSendAt })
            .eq('id', enrollment.id);
        } else {
          await supabase
            .from('email_drip_enrollments')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', enrollment.id);
        }
      }
    }

    return new Response(JSON.stringify({ processed, sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
