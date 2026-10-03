import type { z } from 'zod'
import { outreachTargetSchema } from '../utils/outreach'
type Seed = z.input<typeof outreachTargetSchema>
const retrievedAt = '2026-10-03T00:00:00.000Z'
/** Reviewed first-party entry routes, not invented promises of lab access. */
export const outreachSeeds: Seed[] = [
  {
    name: 'UT Southwestern STARS — mentoring & science ambassadors',
    kind: 'program',
    organization: 'UT Southwestern Medical Center',
    disciplines: ['Biomedical sciences'],
    canonicalUrl:
      'https://www.utsouthwestern.edu/education/nondegree-programs/stars/programs/science-outreach-programs.html',
    contactEmail: 'starsmail@utsouthwestern.edu',
    location: 'Dallas / North Texas schools',
    mode: 'hybrid',
    scope: 'both',
    status: 'needs_review',
    description:
      'Established school-facing pathway for temporary project mentors, research talks, and classroom dialogue with biomedical researchers.',
    dossier: {
      evidence: [
        {
          url: 'https://www.utsouthwestern.edu/education/nondegree-programs/stars/programs/science-outreach-programs.html',
          claim:
            'STARS faculty and staff can act as temporary mentors to advise students working on research projects; Science Ambassadors speak at area schools.',
          quote:
            'UT Southwestern faculty and staff can act as temporary mentors to advise and direct students working on research projects.',
          retrievedAt,
          confidence: 'verified',
        },
      ],
      eligibility:
        'School-facing secondary science outreach. Individual mentor availability and project approval must be confirmed; no blanket lab access.',
      opportunities:
        'Ask an adult school sponsor to coordinate a biomedical research introduction and a small number of scoped project consultations.',
      proposalAngles: [
        'A short biomedical research conversation tailored to prepared student questions.',
        'A temporary mentor match for a defined student research project.',
      ],
    },
    assessment: {
      confidence: 'high',
      rationale:
        'Explicit documented student mentoring and school outreach, not inferred from prestige.',
      blockers: ['Confirm availability and adult school coordination before making commitments.'],
    },
  },
  {
    name: 'UTA Engineering — Visit & Connect',
    kind: 'program',
    organization: 'University of Texas at Arlington',
    disciplines: ['Engineering', 'Robotics'],
    canonicalUrl: 'https://www.uta.edu/academics/schools-colleges/engineering/outreach',
    contactEmail: null,
    location: 'Arlington, Texas',
    mode: 'in_person',
    scope: 'society',
    status: 'needs_review',
    description:
      'Nearby school/group tours and engineering student ambassadors; a practical institutional introduction before approaching specific laboratories.',
    dossier: {
      evidence: [
        {
          url: 'https://www.uta.edu/academics/schools-colleges/engineering/outreach',
          claim:
            'STEM-related groups can request a group tour; engineering ambassadors educate high-school students about engineering fields.',
          retrievedAt,
          confidence: 'verified',
        },
      ],
      eligibility:
        'Group tours and ambassadors are documented; independent laboratory participation is not.',
      opportunities:
        'Coordinate an engineering tour or student-led demonstration through the official group request route.',
      proposalAngles: [
        'School-sponsored research facility introduction.',
        'Engineering ambassador discussion with prepared research questions.',
      ],
    },
    assessment: {
      confidence: 'high',
      rationale:
        'Explicit high-school outreach in Arlington, geographically practical for initial connections.',
      blockers: ['Use the official request route; no verified public email recorded.'],
    },
  },
  {
    name: 'UTA SMILE — Junzhou Huang',
    kind: 'pi',
    organization: 'University of Texas at Arlington',
    disciplines: ['AI & Machine Learning', 'Biomedical sciences', 'Computer vision'],
    canonicalUrl: 'https://uta-smile.github.io/',
    contactEmail: 'jzhuang@uta.edu',
    location: 'Arlington, Texas',
    mode: 'unknown',
    scope: 'both',
    status: 'needs_review',
    description:
      'Machine learning for computational pathology, medical imaging, molecular representations, and scientific data.',
    dossier: {
      evidence: [
        {
          url: 'https://uta-smile.github.io/',
          claim:
            'Lab describes computational pathology, graph learning, biomedical imaging, and AI for biology.',
          retrievedAt,
          confidence: 'verified',
        },
        {
          url: 'https://ranger.uta.edu/~huang/',
          claim:
            'Recruitment explicitly includes UTA undergraduates seeking internships and graduate/postdoctoral researchers, not verified high-school placements.',
          retrievedAt,
          confidence: 'verified',
        },
      ],
      research:
        'Efficient scientific learning; whole-slide imaging; molecular graphs; multimodal biomedical representations.',
      eligibility:
        'High-school mentoring/access unverified. Undergraduate recruitment does not establish minor eligibility. Clinical data permissions must be explicit.',
      opportunities:
        'A qualified student could propose reproducibility/error analysis using permitted public code/data, demonstrating a working baseline first.',
      proposalAngles: [
        'Scoped public-code replication with reproducible error report.',
        'Biomedical AI research discussion, not a publication promise.',
      ],
    },
    assessment: {
      confidence: 'medium',
      rationale:
        'Strong research fit and local computational option; school-age participation remains unknown.',
      blockers: [
        'Require demonstrated student skills and one recently verified project.',
        'Ask institutional eligibility and data-permission questions.',
      ],
    },
  },
  {
    name: 'UTA Heracleia — Fillia Makedon / Farnaz Farahanipad',
    kind: 'lab',
    organization: 'University of Texas at Arlington',
    disciplines: ['Robotics', 'AI & Machine Learning', 'Assistive technology'],
    canonicalUrl: 'https://heracleia.uta.edu/',
    contactEmail: null,
    location: 'Arlington, Texas',
    mode: 'unknown',
    scope: 'both',
    status: 'needs_review',
    description:
      'Human-centered computing, assistive technologies, robotics, vision, and machine learning.',
    dossier: {
      evidence: [
        {
          url: 'https://www.uta.edu/academics/schools-colleges/engineering/academics/departments/cse/research',
          claim:
            'University identifies lab directors and research in robotics, assistive technologies, computer vision and ML.',
          retrievedAt,
          confidence: 'verified',
        },
        {
          url: 'https://heracleia.uta.edu/people.html',
          claim:
            'Lab lists current PhD candidates and undergraduate REU students; these do not establish high-school acceptance.',
          retrievedAt,
          confidence: 'verified',
        },
      ],
      eligibility:
        'High-school access unknown. Ask whether a willing supervised mentor exists; human-subject work requires institutional approval.',
      opportunities:
        'Assistive-technology discussion or a scoped public-data demonstrator evaluation.',
      proposalAngles: [
        'Short project-feedback session on an actual assistive-technology prototype.',
        'Public-data evaluation with a clear rubric and supervision.',
      ],
    },
    assessment: {
      confidence: 'medium',
      rationale:
        'Local interdisciplinary fit; undergraduate mentorship evidence is narrower than high-school eligibility.',
      blockers: [
        'Verify professional contact before drafting.',
        'No minor access or supervision has been offered.',
      ],
    },
  },
  {
    name: 'UTA MIND — Dajiang Zhu',
    kind: 'pi',
    organization: 'University of Texas at Arlington',
    disciplines: ['AI & Machine Learning', 'Neuroscience', 'Biomedical sciences'],
    canonicalUrl: 'https://ranger.uta.edu/~zhu/',
    contactEmail: 'dajiang.zhu@uta.edu',
    location: 'Arlington, Texas',
    mode: 'unknown',
    scope: 'both',
    status: 'needs_review',
    description:
      'Brain imaging, computational modeling, and machine learning for structural and functional neuroscience.',
    dossier: {
      evidence: [
        {
          url: 'https://ranger.uta.edu/~zhu/',
          claim:
            'Lab describes brain architecture, imaging, computational modeling and AI; lists Dajiang Zhu and professional email.',
          retrievedAt,
          confidence: 'verified',
        },
      ],
      eligibility:
        'High-school mentoring unverified. Do not assume permission for patient data or human-subject research.',
      opportunities:
        'A reproducibility or documented preprocessing comparison using permitted public brain-imaging data.',
      proposalAngles: [
        'Specific public-data analysis proposal tied to a recent paper.',
        'Neuroscience/AI research conversation.',
      ],
    },
    assessment: {
      confidence: 'medium',
      rationale:
        'Relevant local biomedical-AI expertise; site contains template remnants and project-specific claims need paper corroboration.',
      blockers: ['Verify recent publication and current project before personalization.'],
    },
  },
  {
    name: 'UTA Multi-modal Imaging and Neuromodulation — Hanli Liu',
    kind: 'pi',
    organization: 'University of Texas at Arlington',
    disciplines: ['Biomedical engineering', 'Neuroscience', 'Medical imaging'],
    canonicalUrl:
      'https://www.uta.edu/academics/schools-colleges/engineering/research/centers-and-labs/mmin',
    contactEmail: null,
    location: 'Arlington, Texas',
    mode: 'unknown',
    scope: 'both',
    status: 'needs_review',
    description:
      'Near-infrared spectroscopy, biomedical optics, signal analysis, functional brain imaging and neuromodulation.',
    dossier: {
      evidence: [
        {
          url: 'https://www.uta.edu/academics/schools-colleges/engineering/research/centers-and-labs/mmin',
          claim:
            'Official lab page identifies Hanli Liu and research in NIRS, image reconstruction, signal processing, wavelet coherence and optical imaging.',
          retrievedAt,
          confidence: 'verified',
        },
      ],
      eligibility:
        'No high-school access verified. No independent laser stimulation, human-subject experiments, or clinical measurements should be proposed.',
      opportunities: 'Biomedical optics talk or simulation/public-data signal-analysis guidance.',
      proposalAngles: [
        'Biomedical optics introduction for prepared society members.',
        'Simulation or public-data analysis with explicit permission and supervision.',
      ],
    },
    assessment: {
      confidence: 'medium',
      rationale:
        'Strong local biomedical engineering fit, but physical research has substantial safety and approval requirements.',
      blockers: [
        'Verify professional contact.',
        'Institutional safety, age, supervision and project restrictions must be resolved.',
      ],
    },
  },
  {
    name: 'UT Dallas IRVL — Yu Xiang',
    kind: 'pi',
    organization: 'University of Texas at Dallas',
    disciplines: ['Robotics', 'AI & Machine Learning', 'Computer vision'],
    canonicalUrl: 'https://yuxng.github.io/',
    contactEmail: null,
    location: 'Richardson, Texas',
    mode: 'unknown',
    scope: 'both',
    status: 'needs_review',
    description:
      'Robot perception, planning, control, manipulation, and vision-language-action systems.',
    dossier: {
      evidence: [
        {
          url: 'https://yuxng.github.io/',
          claim:
            'Faculty site verifies UTD affiliation, robotics/vision interests, and September 2026 talks on reproducible manipulation and vision-language-action models.',
          retrievedAt,
          confidence: 'verified',
        },
      ],
      eligibility:
        'High-school openness and robot access unknown. Richardson is less convenient than Arlington for frequent commuting.',
      opportunities:
        'Benchmark reproducibility/error analysis by a student with a demonstrable robotics/ML baseline; simulation is a proposed scope, not an offered placement.',
      proposalAngles: [
        'Reproduce a permitted manipulation benchmark and provide a documented error analysis.',
        'Focused robotics research conversation.',
      ],
    },
    assessment: {
      confidence: 'medium',
      rationale:
        'Strong robotics/AI fit and current first-party research evidence; participation availability remains unknown.',
      blockers: [
        'Verify official contact and suitable current public-code project.',
        'Do not assume physical robot access.',
      ],
    },
  },
  {
    name: 'UT Southwestern STARS — school tours',
    kind: 'program',
    organization: 'UT Southwestern Medical Center',
    disciplines: ['Biomedical sciences', 'Medicine'],
    canonicalUrl:
      'https://www.utsouthwestern.edu/education/nondegree-programs/stars/programs/student-tours.html',
    contactEmail: 'bibiana.mendez@utsouthwestern.edu',
    location: 'Dallas, Texas',
    mode: 'in_person',
    scope: 'society',
    status: 'needs_review',
    description:
      'A school-mediated introduction to biomedical research through curriculum-connected tours and expert lectures.',
    dossier: {
      evidence: [
        {
          url: 'https://www.utsouthwestern.edu/education/nondegree-programs/stars/programs/student-tours.html',
          claim:
            'Tours are designed for grades 9–12 and require teacher/administrator submission and school approval. Laboratory visits depend on availability.',
          retrievedAt,
          confidence: 'verified',
        },
      ],
      eligibility:
        'Grades 9–12. Teacher or administrator must request the tour; principal/designated administrator approval required. Request at least two months before the preferred date.',
      proposalAngles: [
        'Ask the school sponsor to coordinate a biomedical research tour with six relevant topics.',
      ],
    },
    assessment: {
      confidence: 'high',
      rationale:
        'An explicit first-party high-school outreach pathway near Arlington; coordination and approval remain required.',
      blockers: ['School sponsor and administrative approval must be arranged.'],
    },
  },
  {
    name: 'UT Southwestern STARS — summer research',
    kind: 'program',
    organization: 'UT Southwestern Medical Center',
    disciplines: ['Biomedical sciences'],
    canonicalUrl:
      'https://www.utsouthwestern.edu/education/nondegree-programs/stars/programs/summer-research-opportunities.html',
    contactEmail: 'starsmail@utsouthwestern.edu',
    location: 'Dallas, Texas',
    mode: 'in_person',
    scope: 'student',
    status: 'needs_review',
    description:
      'Eight-week non-residential biomedical laboratory research with a stipend and end-of-summer presentation; use the formal application pathway.',
    dossier: {
      evidence: [
        {
          url: 'https://www.utsouthwestern.edu/education/nondegree-programs/stars/programs/summer-research-opportunities.html',
          claim:
            'Student applicants must be current high-school juniors, at least 16 by June 1, eligible to work in the U.S., and without prior research experience. Summer 2027 applications open November 16, 2026 and close January 22, 2027.',
          retrievedAt,
          confidence: 'verified',
        },
      ],
      eligibility:
        'North Texas high-school juniors; age 16 by June 1; U.S. citizenship/nationality or work eligibility; no prior research experience. Non-residential participation requires commuting.',
      proposalAngles: [
        'Help eligible students prepare for the formal application; do not ask to bypass selection.',
      ],
    },
    assessment: {
      confidence: 'high',
      rationale: 'Explicit local student research pathway with strict eligibility.',
      blockers: ['Requires an eligible matched student and reliable commuting.'],
    },
  },
]
