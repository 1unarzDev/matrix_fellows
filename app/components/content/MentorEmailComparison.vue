<template>
  <figure class="my-8">
    <figcaption class="mb-4 text-[10px] uppercase tracking-[.18em] text-paper/38">
      The same request, two ways
    </figcaption>
    <div class="grid gap-4 lg:grid-cols-2">
      <section class="rounded-2xl border border-rose-200/18 bg-rose-200/[.03] p-5">
        <p class="text-[10px] uppercase tracking-[.16em] text-rose-100/55">Too broad</p>
        <p class="mt-4 text-sm text-paper/72">Subject: Research opportunity</p>
        <p class="mt-4 text-sm leading-6 text-paper/52">
          Dear Professor, I am passionate about AI and would love to work in your prestigious lab. I
          am a fast learner and can help with anything. Do you have an internship for me? I attached
          my résumé. Please respond soon.
        </p>
        <p class="mt-5 text-xs leading-5 text-paper/38">
          No evidence of fit, no bounded request, and claims the student cannot yet support.
        </p>
      </section>
      <section class="rounded-2xl border border-acid/24 bg-acid/[.035] p-5">
        <p class="text-[10px] uppercase tracking-[.16em] text-acid/75">Specific and credible</p>
        <p class="mt-4 text-sm text-paper/72">
          Subject: Question about tactile sensing for robot grasping
        </p>
        <p class="mt-4 text-sm leading-6 text-paper/62">
          Dear Professor Chen, I’m a junior at Martin High School exploring how tactile signals can
          help a gripper detect a slipping object. I read the abstract and introduction of your
          group’s recent paper on event-based touch sensing; the comparison between vision-only and
          touch-assisted control helped me narrow my question. I have built small Python/Arduino
          projects, but I am new to robotics research. Could I ask you two or three questions in a
          15-minute conversation about whether a simulation-first version of this idea is feasible?
          If someone else in your group is a better person to ask, I would appreciate a referral.
          Thank you for your time.
        </p>
        <p class="mt-5 text-xs leading-5 text-paper/42">
          Shows preparation, stays honest about experience, and makes one small request.
        </p>
      </section>
    </div>
  </figure>
</template>
