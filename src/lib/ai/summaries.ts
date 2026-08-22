import { openaiClient, isAIConfigured } from './client';
import { PreVisitSummarySchema, PostVisitSummarySchema, PreVisitSummaryInput, PostVisitSummaryInput } from './schemas';
import { PRE_VISIT_SYSTEM_PROMPT, POST_VISIT_SYSTEM_PROMPT } from './prompts';

const TIMEOUT_MS = 8000; // 8 seconds maximum timeout

// Fallback objects
const PRE_VISIT_FALLBACK: PreVisitSummaryInput & { isFallback: boolean } = {
  urgency: 'ROUTINE',
  chiefComplaint: 'Awaiting AI symptoms analysis. Primary intake logged.',
  suggestedQuestions: [
    'How long have you experienced these symptoms?',
    'Does anything make the symptoms better or worse?',
    'Have you taken any home remedies or over-the-counter medications?',
  ],
  isFallback: true,
};

const POST_VISIT_FALLBACK: PostVisitSummaryInput & { isFallback: boolean } = {
  patientFriendlySummary: 'Your medical visit has been logged. Follow basic recovery directions and monitor for updates.',
  lifestyleAdvice: [
    'Rest and stay hydrated.',
    'Follow up with the clinic if symptoms persist or worsen.',
    'Avoid heavy exercise until recovery.',
  ],
  medications: [],
  isFallback: true,
};

// Timeout helper
function timeoutPromise<T>(ms: number, fallbackValue: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(fallbackValue);
    }, ms);
  });
}

// Rules-based deterministic mock generator
function getPreVisitMock(symptoms: string): PreVisitSummaryInput & { isFallback: boolean } {
  const text = symptoms.toLowerCase();
  
  if (text.includes('chest pain') || text.includes('shortness of breath') || text.includes('bleeding') || text.includes('emergency')) {
    return {
      urgency: 'EMERGENCY',
      chiefComplaint: symptoms.substring(0, 100) + '...',
      suggestedQuestions: [
        'When did the onset of chest tightness or discomfort start?',
        'Does the pain radiate to your arm, neck, or jaw?',
        'Do you feel nauseous, sweaty, or lightheaded?',
      ],
      isFallback: false,
    };
  }

  if (text.includes('fever') || text.includes('throat') || text.includes('vomit') || text.includes('pain')) {
    return {
      urgency: 'URGENT',
      chiefComplaint: `Acute concern presenting: ${symptoms.substring(0, 80)}`,
      suggestedQuestions: [
        'What is your current body temperature?',
        'Are you experiencing chills or body aches?',
        'Are you able to keep fluids down?',
      ],
      isFallback: false,
    };
  }

  return {
    urgency: 'ROUTINE',
    chiefComplaint: `Routine symptom tracking: ${symptoms.substring(0, 80)}`,
    suggestedQuestions: [
      'Have you noticed any triggers that worsen the condition?',
      'Has this concern occurred in the past?',
      'Are you taking any daily supplements?',
    ],
    isFallback: false,
  };
}

function getPostVisitMock(clinicalNotes: string): PostVisitSummaryInput & { isFallback: boolean } {
  const text = clinicalNotes.toLowerCase();
  
  // Custom mock parsing for simple meds in unstructured notes
  const medicationsList: any[] = [];
  
  if (text.includes('aspirin')) {
    medicationsList.push({
      name: 'Baby Aspirin (81mg)',
      dosage: '1 tablet',
      frequency: 'Once daily (morning)',
      durationDays: 30,
      instructions: 'Take with food to prevent stomach irritation.',
    });
  }

  if (text.includes('amoxicillin') || text.includes('antibiotic')) {
    medicationsList.push({
      name: 'Amoxicillin (500mg)',
      dosage: '1 capsule',
      frequency: 'Three times daily',
      durationDays: 7,
      instructions: 'Complete the entire course even if feeling better.',
    });
  }

  if (medicationsList.length === 0) {
    medicationsList.push({
      name: 'Ibuprofen (400mg)',
      dosage: '1 tablet',
      frequency: 'Every 6 hours as needed',
      durationDays: 5,
      instructions: 'Take for pain or fever relief. Do not take on an empty stomach.',
    });
  }

  return {
    patientFriendlySummary: `The doctor reviewed your notes: "${clinicalNotes}". You are recommended to rest, monitor symptoms, and take prescribed medications.`,
    lifestyleAdvice: [
      'Get plenty of sleep (7-8 hours).',
      'Increase fluid intake (at least 2-3 liters of water daily).',
      'Limit strenuous activities for the next few days.',
    ],
    medications: medicationsList,
    isFallback: false,
  };
}

/**
 * Generate Pre-Visit summary from patient symptoms
 */
export async function generatePreVisitSummary(
  symptoms: string
): Promise<PreVisitSummaryInput & { isFallback: boolean }> {
  if (!symptoms.trim()) {
    return PRE_VISIT_FALLBACK;
  }

  const client = openaiClient;
  if (!isAIConfigured || !client) {
    return getPreVisitMock(symptoms);
  }

  const apiCall = async (): Promise<PreVisitSummaryInput & { isFallback: boolean }> => {
    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: PRE_VISIT_SYSTEM_PROMPT },
          { role: 'user', content: `Patient Symptoms: ${symptoms}` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('Empty AI response');

      const parsed = JSON.parse(content);
      const validated = PreVisitSummarySchema.parse(parsed);

      return {
        ...validated,
        isFallback: false,
      };
    } catch (err) {
      console.error('LLM API error during pre-visit generation:', err);
      throw err;
    }
  };

  try {
    // Race between the real API call and the fallback timeout
    return await Promise.race([
      apiCall(),
      timeoutPromise(TIMEOUT_MS, { ...PRE_VISIT_FALLBACK, chiefComplaint: symptoms.substring(0, 150) }),
    ]);
  } catch {
    return { ...PRE_VISIT_FALLBACK, chiefComplaint: symptoms.substring(0, 150) };
  }
}

/**
 * Generate Post-Visit summary from clinical notes
 */
export async function generatePostVisitSummary(
  clinicalNotes: string
): Promise<PostVisitSummaryInput & { isFallback: boolean }> {
  if (!clinicalNotes.trim()) {
    return POST_VISIT_FALLBACK;
  }

  const client = openaiClient;
  if (!isAIConfigured || !client) {
    return getPostVisitMock(clinicalNotes);
  }

  const apiCall = async (): Promise<PostVisitSummaryInput & { isFallback: boolean }> => {
    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: POST_VISIT_SYSTEM_PROMPT },
          { role: 'user', content: `Doctor Clinical Notes: ${clinicalNotes}` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.15,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('Empty AI response');

      const parsed = JSON.parse(content);
      const validated = PostVisitSummarySchema.parse(parsed);

      return {
        ...validated,
        isFallback: false,
      };
    } catch (err) {
      console.error('LLM API error during post-visit generation:', err);
      throw err;
    }
  };

  try {
    return await Promise.race([
      apiCall(),
      timeoutPromise(TIMEOUT_MS, POST_VISIT_FALLBACK),
    ]);
  } catch {
    return POST_VISIT_FALLBACK;
  }
}
