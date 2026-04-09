import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0';
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");

    const resend = new Resend(resendApiKey);
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Get active sequences from correct table
    const { data: sequences } = await supabase
      .from('drip_sequences')
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
        .from('drip_enrollments')
        .select('*')
        .eq('sequence_id', seq.id)
        .eq('status', 'active')
        .lte('next_send_at', new Date().toISOString());

      if (!enrollments || enrollments.length === 0) continue;

      // Get sequence steps
      const { data: steps } = await supabase
        .from('drip_sequence_steps')
        .select('*')
        .eq('sequence_id', seq.id)
        .eq('is_active', true)
        .order('step_order');

      if (!steps || steps.length === 0) continue;

      for (const enrollment of enrollments) {
        processed++;
        const currentStep = steps[enrollment.current_step_index];
        if (!currentStep) {
          await supabase.from('drip_enrollments')
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
          await supabase.from('drip_enrollments')
            .update({ status: 'unsubscribed' })
            .eq('id', enrollment.id);
          continue;
        }

        // Get template
        if (!currentStep.template_id) continue;
        const { data: template } = await supabase
          .from('email_templates')
          .select('*')
          .eq('id', currentStep.template_id)
          .single();

        if (!template) continue;

        // Generate unsubscribe link
        const { data: unsubToken } = await supabase
          .from('email_unsubscribe_tokens')
          .upsert({ subscriber_id: subscriber.id }, { onConflict: 'subscriber_id' })
          .select('token')
          .single();

        const unsubUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/email-unsubscribe?token=${unsubToken?.token || ''}`;

        // Replace variables in content
        const variables: Record<string, string> = {
          customer_name: subscriber.name || 'there',
          email: subscriber.email,
          unsubscribe_url: unsubUrl,
        };
        let subject = currentStep.subject_override || template.subject || 'Update from GrabYourCar';
        let htmlContent = template.html_content || '';
        Object.entries(variables).forEach(([key, value]) => {
          const pattern = new RegExp(`\\{${key}\\}`, 'g');
          subject = subject.replace(pattern, value);
          htmlContent = htmlContent.replace(pattern, value);
        });

        // Add unsubscribe footer
        htmlContent += `<div style="text-align:center;margin-top:30px;padding:20px;border-top:1px solid #eee;font-size:12px;color:#999"><a href="${unsubUrl}" style="color:#999">Unsubscribe</a> from these emails</div>`;

        try {
          const emailResult = await resend.emails.send({
            from: 'GrabYourCar <noreply@grabyourcar.com>',
            to: [subscriber.email],
            subject,
            html: htmlContent,
            headers: { 'List-Unsubscribe': `<${unsubUrl}>` },
          });

          // Log the send
          await supabase.from('email_logs').insert({
            recipient_email: subscriber.email,
            recipient_name: subscriber.name,
            subject,
            template_id: template.id,
            sequence_id: seq.id,
            status: emailResult.data?.id ? 'sent' : 'failed',
            resend_id: emailResult.data?.id,
            sent_at: new Date().toISOString(),
            error_message: emailResult.error?.message,
          });

          if (emailResult.data?.id) sent++;
        } catch (e) {
          console.error(`Drip send failed for ${subscriber.email}:`, e);
          await supabase.from('email_logs').insert({
            recipient_email: subscriber.email,
            subject,
            template_id: template.id,
            sequence_id: seq.id,
            status: 'failed',
            error_message: (e as Error).message,
          });
        }

        // Advance to next step
        const nextStepIndex = enrollment.current_step_index + 1;
        const nextStep = steps[nextStepIndex];
        
        if (nextStep) {
          const delayMs = ((nextStep.delay_days || 0) * 86400 + (nextStep.delay_hours || 0) * 3600) * 1000;
          await supabase.from('drip_enrollments')
            .update({ current_step_index: nextStepIndex, next_send_at: new Date(Date.now() + delayMs).toISOString() })
            .eq('id', enrollment.id);
        } else {
          await supabase.from('drip_enrollments')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', enrollment.id);
        }
      }
    }

    return new Response(JSON.stringify({ processed, sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Drip sequence error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
