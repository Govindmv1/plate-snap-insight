import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, userAllergies, dietaryPreferences, mealWeight } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Analyzing food image with AI...');

    // Build the prompt based on user preferences
    const allergyWarning = userAllergies?.length > 0 
      ? `CRITICAL: User is allergic to: ${userAllergies.join(', ')}. Check for these allergens!` 
      : '';
    
    const dietaryInfo = dietaryPreferences?.length > 0
      ? `User follows: ${dietaryPreferences.join(', ')} diet.`
      : '';

    const weightInfo = mealWeight 
      ? `The user indicated the meal weighs approximately ${mealWeight}g. Use this to adjust portion estimates.`
      : 'Estimate portion sizes based on visual analysis.';

    const systemPrompt = `You are a professional nutritionist AI. Analyze food images and provide detailed nutritional information.
    
${allergyWarning}
${dietaryInfo}
${weightInfo}

Return your analysis in this exact JSON format:
{
  "detectedFoods": [
    {
      "name": "food name",
      "portion": "estimated portion size",
      "confidence": 0.95
    }
  ],
  "nutritionalData": {
    "calories": 450,
    "protein": 25,
    "carbs": 50,
    "fat": 15,
    "fiber": 8,
    "sodium": 600,
    "vitamins": ["Vitamin C", "Vitamin B12"],
    "minerals": ["Iron", "Calcium"]
  },
  "allergenAlerts": ["contains gluten", "may contain nuts"],
  "dietaryCompliance": {
    "vegan": false,
    "vegetarian": true,
    "glutenFree": false,
    "keto": false,
    "lowSodium": true
  },
  "healthScore": 7.5,
  "recommendations": ["Consider reducing sodium", "Great protein content"]
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this meal and provide detailed nutritional information in the specified JSON format.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Extract JSON from the response
    let analysisResult;
    try {
      // Try to parse the entire content as JSON
      analysisResult = JSON.parse(content);
    } catch (e) {
      // If that fails, try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[1]);
      } else {
        console.error('Failed to parse AI response:', content);
        throw new Error('Failed to parse AI response');
      }
    }

    console.log('Food analysis complete');

    return new Response(
      JSON.stringify(analysisResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-food function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
