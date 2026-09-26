--
-- PostgreSQL database dump
--

\restrict yhHHLqWZAsa1aeoy94OJQUKigNIpDWexTTExwI0PzEEane3vGUrLkBQTDss7I2D

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: agreement_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.agreement_kind AS ENUM (
    'terms_of_service',
    'escrow_72h',
    'sla_refund',
    'nda',
    'commission'
);


--
-- Name: bank_account_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bank_account_type AS ENUM (
    'savings',
    'current'
);


--
-- Name: booking_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.booking_status AS ENUM (
    'pending_payment',
    'confirmed',
    'in_progress',
    'delivered',
    'completed',
    'disputed',
    'refunded',
    'cancelled',
    'expired'
);


--
-- Name: dispute_reason; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.dispute_reason AS ENUM (
    'mentor_no_show',
    'unprofessional_conduct',
    'poor_evaluation_quality',
    'sla_missed',
    'other'
);


--
-- Name: dispute_state; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.dispute_state AS ENUM (
    'open',
    'under_review',
    'resolved_refund_student',
    'resolved_release_mentor',
    'withdrawn'
);


--
-- Name: document_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.document_kind AS ENUM (
    'aadhaar_front',
    'aadhaar_back',
    'pan_card',
    'cancelled_cheque',
    'mains_marksheet',
    'interview_admit_card',
    'profile_photo',
    'intro_video',
    'answer_pdf',
    'checked_pdf',
    'chat_attachment'
);


--
-- Name: employment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.employment_status AS ENUM (
    'full_time_faculty',
    'independent_mentor',
    'serving_officer',
    'private_sector',
    'full_time_aspirant'
);


--
-- Name: evaluation_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.evaluation_status AS ENUM (
    'sent_to_mentor',
    'mentor_evaluating',
    'evaluation_ready',
    'sla_breached_refunded'
);


--
-- Name: expertise_tag; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.expertise_tag AS ENUM (
    'prelims_strategy',
    'mains_strategy_answer_writing',
    'subject_specific_doubts',
    'timetable_routine_planning',
    'mental_health_stress_motivation'
);


--
-- Name: ledger_entry; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ledger_entry AS ENUM (
    'escrow_hold',
    'escrow_release_mentor',
    'commission',
    'refund_student',
    'payout_mentor',
    'credit_liquidation'
);


--
-- Name: mentor_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.mentor_category AS ENUM (
    'faculty',
    'senior_aspirant',
    'selected_candidate'
);


--
-- Name: mentor_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.mentor_status AS ENUM (
    'draft',
    'pending_verification',
    'live',
    'rejected',
    'suspended'
);


--
-- Name: otp_channel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.otp_channel AS ENUM (
    'email',
    'sms'
);


--
-- Name: otp_purpose; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.otp_purpose AS ENUM (
    'signup',
    'login',
    'password_reset',
    'phone_change'
);


--
-- Name: payment_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_method AS ENUM (
    'upi',
    'card',
    'netbanking',
    'wallet'
);


--
-- Name: payment_state; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_state AS ENUM (
    'created',
    'held_in_escrow',
    'frozen',
    'released',
    'refunded',
    'partially_refunded',
    'failed'
);


--
-- Name: payout_state; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payout_state AS ENUM (
    'scheduled',
    'processing',
    'paid',
    'failed'
);


--
-- Name: prep_stage; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.prep_stage AS ENUM (
    'just_starting_ncert',
    'standard_books_completed',
    'prelims_revision',
    'answer_writing',
    'interview_prep'
);


--
-- Name: retainer_state; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.retainer_state AS ENUM (
    'active',
    'expired',
    'settled',
    'cancelled'
);


--
-- Name: service_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.service_type AS ENUM (
    'video_1on1',
    'offline_evaluation',
    'live_evaluation',
    'retainer'
);


--
-- Name: upsc_paper; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.upsc_paper AS ENUM (
    'prelims',
    'gs1',
    'gs2',
    'gs3',
    'gs4',
    'essay',
    'optional'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'student',
    'mentor',
    'admin'
);


--
-- Name: verification_state; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.verification_state AS ENUM (
    'pending',
    'verified',
    'rejected'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_audit_log (
    id bigint NOT NULL,
    admin_user_id uuid NOT NULL,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    before_state jsonb,
    after_state jsonb,
    ip_address inet,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_audit_log_id_seq OWNED BY public.admin_audit_log.id;


--
-- Name: availability_blackouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.availability_blackouts (
    id bigint NOT NULL,
    mentor_id uuid NOT NULL,
    blackout_date date NOT NULL,
    reason text
);


--
-- Name: availability_blackouts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.availability_blackouts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: availability_blackouts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.availability_blackouts_id_seq OWNED BY public.availability_blackouts.id;


--
-- Name: availability_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.availability_rules (
    id bigint NOT NULL,
    mentor_id uuid NOT NULL,
    weekday smallint NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    is_recurring boolean DEFAULT true NOT NULL,
    effective_from date DEFAULT CURRENT_DATE NOT NULL,
    effective_to date,
    CONSTRAINT availability_range CHECK (((effective_to IS NULL) OR (effective_to >= effective_from))),
    CONSTRAINT availability_rules_weekday_check CHECK (((weekday >= 0) AND (weekday <= 6))),
    CONSTRAINT availability_window CHECK ((end_time > start_time))
);


--
-- Name: availability_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.availability_rules_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: availability_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.availability_rules_id_seq OWNED BY public.availability_rules.id;


--
-- Name: booking_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_status_history (
    id bigint NOT NULL,
    booking_id uuid NOT NULL,
    from_status public.booking_status,
    to_status public.booking_status NOT NULL,
    actor_user_id uuid,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: booking_status_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.booking_status_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: booking_status_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.booking_status_history_id_seq OWNED BY public.booking_status_history.id;


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reference text NOT NULL,
    student_id uuid NOT NULL,
    mentor_id uuid NOT NULL,
    service_id uuid NOT NULL,
    retainer_contract_id uuid,
    service_type public.service_type NOT NULL,
    unit_price_paise bigint NOT NULL,
    quantity smallint DEFAULT 1 NOT NULL,
    amount_paise bigint NOT NULL,
    commission_pct numeric(4,2) NOT NULL,
    commission_paise bigint NOT NULL,
    mentor_net_paise bigint NOT NULL,
    paid_with_credit boolean DEFAULT false NOT NULL,
    slot_start timestamp with time zone,
    slot_end timestamp with time zone,
    agenda text,
    is_anonymous boolean DEFAULT false NOT NULL,
    status public.booking_status DEFAULT 'pending_payment'::public.booking_status NOT NULL,
    delivered_at timestamp with time zone,
    auto_release_at timestamp with time zone,
    completed_at timestamp with time zone,
    cancelled_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT amount_math CHECK (((amount_paise = (unit_price_paise * quantity)) AND (amount_paise = (commission_paise + mentor_net_paise)))),
    CONSTRAINT booking_is_not_retainer CHECK ((service_type <> 'retainer'::public.service_type)),
    CONSTRAINT bookings_amount_paise_check CHECK ((amount_paise >= 0)),
    CONSTRAINT bookings_commission_paise_check CHECK ((commission_paise >= 0)),
    CONSTRAINT bookings_mentor_net_paise_check CHECK ((mentor_net_paise >= 0)),
    CONSTRAINT bookings_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT bookings_unit_price_paise_check CHECK ((unit_price_paise >= 0)),
    CONSTRAINT credit_needs_contract CHECK (((paid_with_credit = false) OR (retainer_contract_id IS NOT NULL))),
    CONSTRAINT quantity_only_for_offline CHECK (((service_type = 'offline_evaluation'::public.service_type) OR (quantity = 1))),
    CONSTRAINT slot_required_for_live CHECK ((((service_type = ANY (ARRAY['video_1on1'::public.service_type, 'live_evaluation'::public.service_type])) AND (slot_start IS NOT NULL) AND (slot_end > slot_start)) OR ((service_type = 'offline_evaluation'::public.service_type) AND (slot_start IS NULL))))
);


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id bigint NOT NULL,
    thread_id uuid NOT NULL,
    sender_user_id uuid NOT NULL,
    body text,
    attachment_doc_id uuid,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    read_at timestamp with time zone,
    CONSTRAINT message_has_content CHECK (((COALESCE(length(TRIM(BOTH FROM body)), 0) > 0) OR (attachment_doc_id IS NOT NULL)))
);


--
-- Name: chat_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chat_messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chat_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chat_messages_id_seq OWNED BY public.chat_messages.id;


--
-- Name: chat_threads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_threads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    mentor_id uuid NOT NULL,
    last_message_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: disputes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.disputes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    raised_by uuid NOT NULL,
    reason public.dispute_reason NOT NULL,
    description text NOT NULL,
    state public.dispute_state DEFAULT 'open'::public.dispute_state NOT NULL,
    refund_paise bigint,
    resolution_note text,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT disputes_refund_paise_check CHECK ((refund_paise >= 0)),
    CONSTRAINT resolution_complete CHECK (((state <> ALL (ARRAY['resolved_refund_student'::public.dispute_state, 'resolved_release_mentor'::public.dispute_state])) OR ((resolved_by IS NOT NULL) AND (resolved_at IS NOT NULL))))
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_user_id uuid NOT NULL,
    kind public.document_kind NOT NULL,
    storage_key text NOT NULL,
    mime_type text NOT NULL,
    size_bytes bigint NOT NULL,
    original_name text,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT documents_size_bytes_check CHECK ((size_bytes > 0)),
    CONSTRAINT documents_size_cap CHECK (
CASE kind
    WHEN 'intro_video'::public.document_kind THEN (size_bytes <= ((50 * 1024) * 1024))
    WHEN 'answer_pdf'::public.document_kind THEN (size_bytes <= ((10 * 1024) * 1024))
    WHEN 'checked_pdf'::public.document_kind THEN (size_bytes <= ((10 * 1024) * 1024))
    ELSE (size_bytes <= ((5 * 1024) * 1024))
END)
);


--
-- Name: escrow_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.escrow_ledger (
    id bigint NOT NULL,
    payment_id uuid,
    booking_id uuid,
    retainer_contract_id uuid,
    payout_id uuid,
    entry_type public.ledger_entry NOT NULL,
    amount_paise bigint NOT NULL,
    idempotency_key text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: escrow_ledger_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.escrow_ledger_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: escrow_ledger_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.escrow_ledger_id_seq OWNED BY public.escrow_ledger.id;


--
-- Name: evaluations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evaluations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    answer_doc_id uuid NOT NULL,
    answer_count smallint NOT NULL,
    status public.evaluation_status DEFAULT 'sent_to_mentor'::public.evaluation_status NOT NULL,
    sla_hours smallint NOT NULL,
    sla_deadline timestamp with time zone NOT NULL,
    checked_doc_id uuid,
    mentor_remarks text,
    submitted_at timestamp with time zone,
    downloaded_at timestamp with time zone,
    auto_refunded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT evaluations_answer_count_check CHECK ((answer_count > 0)),
    CONSTRAINT evaluations_sla_hours_check CHECK ((sla_hours = ANY (ARRAY[24, 48, 72]))),
    CONSTRAINT ready_needs_file CHECK (((status <> 'evaluation_ready'::public.evaluation_status) OR ((checked_doc_id IS NOT NULL) AND (submitted_at IS NOT NULL))))
);


--
-- Name: mentor_agreements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mentor_agreements (
    id bigint NOT NULL,
    mentor_id uuid NOT NULL,
    kind public.agreement_kind NOT NULL,
    version text NOT NULL,
    accepted_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address inet,
    user_agent text
);


--
-- Name: mentor_agreements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mentor_agreements_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mentor_agreements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mentor_agreements_id_seq OWNED BY public.mentor_agreements.id;


--
-- Name: mentor_credentials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mentor_credentials (
    mentor_id uuid NOT NULL,
    total_attempts smallint NOT NULL,
    prelims_cleared_years smallint[] DEFAULT '{}'::smallint[] NOT NULL,
    mains_cleared_years smallint[] DEFAULT '{}'::smallint[] NOT NULL,
    mains_marksheet_doc_id uuid,
    interview_years smallint[] DEFAULT '{}'::smallint[] NOT NULL,
    interview_admit_doc_id uuid,
    has_final_rank boolean DEFAULT false NOT NULL,
    final_rank integer,
    service_allocated text,
    batch_year smallint,
    state public.verification_state DEFAULT 'pending'::public.verification_state NOT NULL,
    verified_by uuid,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT final_rank_complete CHECK (((has_final_rank = false) OR ((final_rank IS NOT NULL) AND (service_allocated IS NOT NULL) AND (batch_year IS NOT NULL)))),
    CONSTRAINT interview_needs_admit_card CHECK (((cardinality(interview_years) = 0) OR (interview_admit_doc_id IS NOT NULL))),
    CONSTRAINT mains_needs_marksheet CHECK (((cardinality(mains_cleared_years) = 0) OR (mains_marksheet_doc_id IS NOT NULL))),
    CONSTRAINT mentor_credentials_batch_year_check CHECK (((batch_year >= 2000) AND (batch_year <= 2040))),
    CONSTRAINT mentor_credentials_final_rank_check CHECK ((final_rank > 0)),
    CONSTRAINT mentor_credentials_total_attempts_check CHECK (((total_attempts >= 0) AND (total_attempts <= 10)))
);


--
-- Name: mentor_daily_load; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mentor_daily_load (
    mentor_id uuid NOT NULL,
    load_date date NOT NULL,
    accepted_copies smallint DEFAULT 0 NOT NULL,
    CONSTRAINT mentor_daily_load_accepted_copies_check CHECK ((accepted_copies >= 0))
);


--
-- Name: mentor_kyc; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mentor_kyc (
    mentor_id uuid NOT NULL,
    aadhaar_number_enc bytea NOT NULL,
    aadhaar_last4 character(4) NOT NULL,
    aadhaar_front_doc_id uuid NOT NULL,
    aadhaar_back_doc_id uuid NOT NULL,
    pan_number character(10) NOT NULL,
    pan_doc_id uuid NOT NULL,
    bank_holder_name text NOT NULL,
    bank_account_enc bytea NOT NULL,
    bank_account_last4 character(4) NOT NULL,
    bank_ifsc character(11) NOT NULL,
    bank_account_type public.bank_account_type NOT NULL,
    cheque_doc_id uuid NOT NULL,
    state public.verification_state DEFAULT 'pending'::public.verification_state NOT NULL,
    verified_by uuid,
    verified_at timestamp with time zone,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ifsc_format CHECK ((bank_ifsc ~ '^[A-Z]{4}0[A-Z0-9]{6}$'::text)),
    CONSTRAINT pan_format CHECK ((pan_number ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'::text))
);


--
-- Name: mentor_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mentor_profiles (
    user_id uuid NOT NULL,
    display_name text NOT NULL,
    category public.mentor_category NOT NULL,
    employment_status public.employment_status NOT NULL,
    about_me text,
    profile_photo_id uuid,
    intro_video_id uuid,
    status public.mentor_status DEFAULT 'draft'::public.mentor_status NOT NULL,
    onboarding_step smallint DEFAULT 1 NOT NULL,
    commission_pct numeric(4,2) DEFAULT 15.00 NOT NULL,
    max_daily_copies smallint,
    calendar_horizon_weeks smallint DEFAULT 2 NOT NULL,
    rating_avg numeric(3,2),
    rating_count integer DEFAULT 0 NOT NULL,
    submitted_at timestamp with time zone,
    verified_by uuid,
    verified_at timestamp with time zone,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mentor_live_requires_verification CHECK (((status <> 'live'::public.mentor_status) OR ((verified_by IS NOT NULL) AND (verified_at IS NOT NULL)))),
    CONSTRAINT mentor_profiles_about_me_check CHECK ((length(about_me) <= 2000)),
    CONSTRAINT mentor_profiles_calendar_horizon_weeks_check CHECK ((calendar_horizon_weeks = ANY (ARRAY[2, 4]))),
    CONSTRAINT mentor_profiles_commission_pct_check CHECK (((commission_pct >= 15.00) AND (commission_pct <= 20.00))),
    CONSTRAINT mentor_profiles_max_daily_copies_check CHECK (((max_daily_copies >= 1) AND (max_daily_copies <= 50))),
    CONSTRAINT mentor_profiles_onboarding_step_check CHECK (((onboarding_step >= 1) AND (onboarding_step <= 8))),
    CONSTRAINT mentor_profiles_rating_avg_check CHECK (((rating_avg >= (1)::numeric) AND (rating_avg <= (5)::numeric)))
);


--
-- Name: mentor_subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mentor_subjects (
    id bigint NOT NULL,
    mentor_id uuid NOT NULL,
    paper public.upsc_paper NOT NULL,
    topic text,
    optional_subject_id smallint,
    CONSTRAINT subject_shape CHECK ((((paper = 'optional'::public.upsc_paper) AND (optional_subject_id IS NOT NULL) AND (topic IS NULL)) OR ((paper <> 'optional'::public.upsc_paper) AND (topic IS NOT NULL) AND (optional_subject_id IS NULL))))
);


--
-- Name: mentor_subjects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mentor_subjects_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mentor_subjects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mentor_subjects_id_seq OWNED BY public.mentor_subjects.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    channel text NOT NULL,
    template text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    sent_at timestamp with time zone,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: optional_subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.optional_subjects (
    id smallint NOT NULL,
    name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: optional_subjects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.optional_subjects_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: optional_subjects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.optional_subjects_id_seq OWNED BY public.optional_subjects.id;


--
-- Name: otp_verifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.otp_verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    channel public.otp_channel NOT NULL,
    destination text NOT NULL,
    purpose public.otp_purpose NOT NULL,
    code_hash text NOT NULL,
    attempts smallint DEFAULT 0 NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    consumed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT otp_verifications_attempts_check CHECK ((attempts <= 5))
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid,
    retainer_contract_id uuid,
    payout_id uuid,
    student_id uuid NOT NULL,
    mentor_id uuid NOT NULL,
    gross_paise bigint NOT NULL,
    commission_paise bigint NOT NULL,
    mentor_net_paise bigint NOT NULL,
    refunded_paise bigint DEFAULT 0 NOT NULL,
    method public.payment_method,
    provider text DEFAULT 'razorpay'::text NOT NULL,
    provider_order_id text,
    provider_payment_id text,
    state public.payment_state DEFAULT 'created'::public.payment_state NOT NULL,
    escrow_held_at timestamp with time zone,
    release_at timestamp with time zone,
    released_at timestamp with time zone,
    refunded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payment_split_math CHECK ((gross_paise = (commission_paise + mentor_net_paise))),
    CONSTRAINT payment_target_xor CHECK ((num_nonnulls(booking_id, retainer_contract_id) = 1)),
    CONSTRAINT payments_commission_paise_check CHECK ((commission_paise >= 0)),
    CONSTRAINT payments_gross_paise_check CHECK ((gross_paise > 0)),
    CONSTRAINT payments_mentor_net_paise_check CHECK ((mentor_net_paise >= 0)),
    CONSTRAINT payments_refunded_paise_check CHECK ((refunded_paise >= 0)),
    CONSTRAINT refund_within_gross CHECK ((refunded_paise <= gross_paise)),
    CONSTRAINT released_needs_payout CHECK (((state <> 'released'::public.payment_state) OR (released_at IS NOT NULL)))
);


--
-- Name: payouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payouts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mentor_id uuid NOT NULL,
    amount_paise bigint NOT NULL,
    state public.payout_state DEFAULT 'scheduled'::public.payout_state NOT NULL,
    provider_ref text,
    utr text,
    initiated_at timestamp with time zone,
    paid_at timestamp with time zone,
    failure_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payouts_amount_paise_check CHECK ((amount_paise > 0))
);


--
-- Name: retainer_contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.retainer_contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    mentor_id uuid NOT NULL,
    service_id uuid NOT NULL,
    package_title text NOT NULL,
    price_paise bigint NOT NULL,
    commission_pct numeric(4,2) NOT NULL,
    session_credits_total smallint NOT NULL,
    session_credits_used smallint DEFAULT 0 NOT NULL,
    eval_credits_total smallint NOT NULL,
    eval_credits_used smallint DEFAULT 0 NOT NULL,
    purchased_at timestamp with time zone DEFAULT now() NOT NULL,
    valid_until timestamp with time zone NOT NULL,
    state public.retainer_state DEFAULT 'active'::public.retainer_state NOT NULL,
    expiry_settled_at timestamp with time zone,
    CONSTRAINT eval_credits_sane CHECK ((eval_credits_used <= eval_credits_total)),
    CONSTRAINT retainer_contracts_eval_credits_total_check CHECK ((eval_credits_total >= 0)),
    CONSTRAINT retainer_contracts_eval_credits_used_check CHECK ((eval_credits_used >= 0)),
    CONSTRAINT retainer_contracts_price_paise_check CHECK ((price_paise > 0)),
    CONSTRAINT retainer_contracts_session_credits_total_check CHECK ((session_credits_total >= 0)),
    CONSTRAINT retainer_contracts_session_credits_used_check CHECK ((session_credits_used >= 0)),
    CONSTRAINT session_credits_sane CHECK ((session_credits_used <= session_credits_total)),
    CONSTRAINT settled_only_when_expired CHECK (((expiry_settled_at IS NULL) OR (state = ANY (ARRAY['expired'::public.retainer_state, 'settled'::public.retainer_state]))))
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    student_id uuid NOT NULL,
    mentor_id uuid NOT NULL,
    stars smallint NOT NULL,
    review_text text,
    is_public boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reviews_stars_check CHECK (((stars >= 1) AND (stars <= 5)))
);


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mentor_id uuid NOT NULL,
    type public.service_type NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    price_paise bigint NOT NULL,
    duration_minutes smallint,
    sla_hours smallint,
    expertise_tags public.expertise_tag[] DEFAULT '{}'::public.expertise_tag[] NOT NULL,
    package_title text,
    package_deliverables text,
    package_valid_days smallint,
    package_session_credits smallint,
    package_eval_credits smallint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT service_shape CHECK (
CASE type
    WHEN 'video_1on1'::public.service_type THEN ((duration_minutes = 30) AND (sla_hours IS NULL) AND (package_title IS NULL))
    WHEN 'live_evaluation'::public.service_type THEN ((duration_minutes = 45) AND (sla_hours IS NULL) AND (package_title IS NULL))
    WHEN 'offline_evaluation'::public.service_type THEN ((sla_hours = ANY (ARRAY[24, 48, 72])) AND (duration_minutes IS NULL) AND (package_title IS NULL))
    WHEN 'retainer'::public.service_type THEN ((package_title IS NOT NULL) AND (package_deliverables IS NOT NULL) AND (package_valid_days > 0) AND ((COALESCE((package_session_credits)::integer, 0) + COALESCE((package_eval_credits)::integer, 0)) > 0))
    ELSE NULL::boolean
END),
    CONSTRAINT services_price_paise_check CHECK ((price_paise > 0)),
    CONSTRAINT tags_only_for_video CHECK (((type = 'video_1on1'::public.service_type) OR (cardinality(expertise_tags) = 0)))
);


--
-- Name: session_recordings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session_recordings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    storage_key text NOT NULL,
    size_bytes bigint,
    duration_seconds integer,
    is_downloadable boolean DEFAULT false NOT NULL,
    retention_until date NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT recordings_never_downloadable CHECK ((is_downloadable = false)),
    CONSTRAINT session_recordings_size_bytes_check CHECK ((size_bytes > 0))
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    provider text DEFAULT 'daily'::text NOT NULL,
    room_id text NOT NULL,
    join_available_from timestamp with time zone NOT NULL,
    whiteboard_enabled boolean DEFAULT false NOT NULL,
    student_joined_at timestamp with time zone,
    mentor_joined_at timestamp with time zone,
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    duration_seconds integer,
    no_show_by public.user_role,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT session_time_order CHECK (((ended_at IS NULL) OR (ended_at >= started_at))),
    CONSTRAINT sessions_duration_seconds_check CHECK ((duration_seconds >= 0))
);


--
-- Name: student_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_profiles (
    user_id uuid NOT NULL,
    target_year smallint NOT NULL,
    previous_attempts smallint DEFAULT 0 NOT NULL,
    optional_subject_id smallint,
    prep_stages public.prep_stage[] DEFAULT '{}'::public.prep_stage[] NOT NULL,
    biggest_hurdle text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT student_prep_stages_present CHECK ((cardinality(prep_stages) > 0)),
    CONSTRAINT student_profiles_biggest_hurdle_check CHECK ((length(biggest_hurdle) <= 1200)),
    CONSTRAINT student_profiles_previous_attempts_check CHECK (((previous_attempts >= 0) AND (previous_attempts <= 10))),
    CONSTRAINT student_profiles_target_year_check CHECK (((target_year >= 2024) AND (target_year <= 2040)))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role public.user_role NOT NULL,
    legal_name text NOT NULL,
    email public.citext NOT NULL,
    phone text NOT NULL,
    password_hash text NOT NULL,
    email_verified_at timestamp with time zone,
    phone_verified_at timestamp with time zone,
    tos_accepted_at timestamp with time zone,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT users_phone_format CHECK ((phone ~ '^\+91[6-9][0-9]{9}$'::text))
);


--
-- Name: v_mentor_cards; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_mentor_cards AS
SELECT
    NULL::uuid AS mentor_id,
    NULL::text AS display_name,
    NULL::public.mentor_category AS category,
    NULL::uuid AS profile_photo_id,
    NULL::numeric(3,2) AS rating_avg,
    NULL::integer AS rating_count,
    NULL::boolean AS has_final_rank,
    NULL::smallint[] AS mains_cleared_years,
    NULL::bigint AS evaluation_from_paise,
    NULL::bigint AS call_from_paise,
    NULL::public.service_type[] AS active_service_types;


--
-- Name: admin_audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_log ALTER COLUMN id SET DEFAULT nextval('public.admin_audit_log_id_seq'::regclass);


--
-- Name: availability_blackouts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_blackouts ALTER COLUMN id SET DEFAULT nextval('public.availability_blackouts_id_seq'::regclass);


--
-- Name: availability_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_rules ALTER COLUMN id SET DEFAULT nextval('public.availability_rules_id_seq'::regclass);


--
-- Name: booking_status_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_status_history ALTER COLUMN id SET DEFAULT nextval('public.booking_status_history_id_seq'::regclass);


--
-- Name: chat_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages ALTER COLUMN id SET DEFAULT nextval('public.chat_messages_id_seq'::regclass);


--
-- Name: escrow_ledger id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escrow_ledger ALTER COLUMN id SET DEFAULT nextval('public.escrow_ledger_id_seq'::regclass);


--
-- Name: mentor_agreements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_agreements ALTER COLUMN id SET DEFAULT nextval('public.mentor_agreements_id_seq'::regclass);


--
-- Name: mentor_subjects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_subjects ALTER COLUMN id SET DEFAULT nextval('public.mentor_subjects_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: optional_subjects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.optional_subjects ALTER COLUMN id SET DEFAULT nextval('public.optional_subjects_id_seq'::regclass);


--
-- Name: admin_audit_log admin_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_log
    ADD CONSTRAINT admin_audit_log_pkey PRIMARY KEY (id);


--
-- Name: availability_blackouts availability_blackouts_mentor_id_blackout_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_blackouts
    ADD CONSTRAINT availability_blackouts_mentor_id_blackout_date_key UNIQUE (mentor_id, blackout_date);


--
-- Name: availability_blackouts availability_blackouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_blackouts
    ADD CONSTRAINT availability_blackouts_pkey PRIMARY KEY (id);


--
-- Name: availability_rules availability_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_rules
    ADD CONSTRAINT availability_rules_pkey PRIMARY KEY (id);


--
-- Name: booking_status_history booking_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_status_history
    ADD CONSTRAINT booking_status_history_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_reference_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_reference_key UNIQUE (reference);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_threads chat_threads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_threads
    ADD CONSTRAINT chat_threads_pkey PRIMARY KEY (id);


--
-- Name: chat_threads chat_threads_student_id_mentor_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_threads
    ADD CONSTRAINT chat_threads_student_id_mentor_id_key UNIQUE (student_id, mentor_id);


--
-- Name: disputes disputes_booking_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_booking_id_key UNIQUE (booking_id);


--
-- Name: disputes disputes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: documents documents_storage_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_storage_key_key UNIQUE (storage_key);


--
-- Name: escrow_ledger escrow_ledger_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escrow_ledger
    ADD CONSTRAINT escrow_ledger_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: escrow_ledger escrow_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escrow_ledger
    ADD CONSTRAINT escrow_ledger_pkey PRIMARY KEY (id);


--
-- Name: evaluations evaluations_booking_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluations
    ADD CONSTRAINT evaluations_booking_id_key UNIQUE (booking_id);


--
-- Name: evaluations evaluations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluations
    ADD CONSTRAINT evaluations_pkey PRIMARY KEY (id);


--
-- Name: mentor_agreements mentor_agreements_mentor_id_kind_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_agreements
    ADD CONSTRAINT mentor_agreements_mentor_id_kind_version_key UNIQUE (mentor_id, kind, version);


--
-- Name: mentor_agreements mentor_agreements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_agreements
    ADD CONSTRAINT mentor_agreements_pkey PRIMARY KEY (id);


--
-- Name: mentor_credentials mentor_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_credentials
    ADD CONSTRAINT mentor_credentials_pkey PRIMARY KEY (mentor_id);


--
-- Name: mentor_daily_load mentor_daily_load_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_daily_load
    ADD CONSTRAINT mentor_daily_load_pkey PRIMARY KEY (mentor_id, load_date);


--
-- Name: mentor_kyc mentor_kyc_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_kyc
    ADD CONSTRAINT mentor_kyc_pkey PRIMARY KEY (mentor_id);


--
-- Name: mentor_profiles mentor_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_profiles
    ADD CONSTRAINT mentor_profiles_pkey PRIMARY KEY (user_id);


--
-- Name: mentor_subjects mentor_subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_subjects
    ADD CONSTRAINT mentor_subjects_pkey PRIMARY KEY (id);


--
-- Name: bookings no_double_booking; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT no_double_booking EXCLUDE USING gist (mentor_id WITH =, tstzrange(slot_start, slot_end) WITH &&) WHERE (((slot_start IS NOT NULL) AND (status = ANY (ARRAY['confirmed'::public.booking_status, 'in_progress'::public.booking_status, 'delivered'::public.booking_status, 'completed'::public.booking_status, 'disputed'::public.booking_status]))));


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: optional_subjects optional_subjects_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.optional_subjects
    ADD CONSTRAINT optional_subjects_name_key UNIQUE (name);


--
-- Name: optional_subjects optional_subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.optional_subjects
    ADD CONSTRAINT optional_subjects_pkey PRIMARY KEY (id);


--
-- Name: otp_verifications otp_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otp_verifications
    ADD CONSTRAINT otp_verifications_pkey PRIMARY KEY (id);


--
-- Name: payments payments_booking_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_booking_id_key UNIQUE (booking_id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: payments payments_provider_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_provider_order_id_key UNIQUE (provider_order_id);


--
-- Name: payments payments_provider_payment_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_provider_payment_id_key UNIQUE (provider_payment_id);


--
-- Name: payments payments_retainer_contract_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_retainer_contract_id_key UNIQUE (retainer_contract_id);


--
-- Name: payouts payouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payouts
    ADD CONSTRAINT payouts_pkey PRIMARY KEY (id);


--
-- Name: retainer_contracts retainer_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.retainer_contracts
    ADD CONSTRAINT retainer_contracts_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_booking_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_booking_id_key UNIQUE (booking_id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: session_recordings session_recordings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_recordings
    ADD CONSTRAINT session_recordings_pkey PRIMARY KEY (id);


--
-- Name: session_recordings session_recordings_storage_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_recordings
    ADD CONSTRAINT session_recordings_storage_key_key UNIQUE (storage_key);


--
-- Name: sessions sessions_booking_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_booking_id_key UNIQUE (booking_id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: student_profiles student_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_pkey PRIMARY KEY (user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: audit_entity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_entity_idx ON public.admin_audit_log USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: availability_mentor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX availability_mentor_idx ON public.availability_rules USING btree (mentor_id, weekday);


--
-- Name: booking_history_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX booking_history_idx ON public.booking_status_history USING btree (booking_id, created_at);


--
-- Name: bookings_mentor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bookings_mentor_idx ON public.bookings USING btree (mentor_id, slot_start);


--
-- Name: bookings_release_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bookings_release_idx ON public.bookings USING btree (auto_release_at) WHERE (status = 'delivered'::public.booking_status);


--
-- Name: bookings_student_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bookings_student_idx ON public.bookings USING btree (student_id, created_at DESC);


--
-- Name: chat_messages_thread_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chat_messages_thread_idx ON public.chat_messages USING btree (thread_id, sent_at DESC);


--
-- Name: disputes_open_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX disputes_open_idx ON public.disputes USING btree (created_at) WHERE (state = ANY (ARRAY['open'::public.dispute_state, 'under_review'::public.dispute_state]));


--
-- Name: documents_owner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_owner_idx ON public.documents USING btree (owner_user_id, kind);


--
-- Name: evaluations_sla_sweep_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX evaluations_sla_sweep_idx ON public.evaluations USING btree (sla_deadline) WHERE (status = ANY (ARRAY['sent_to_mentor'::public.evaluation_status, 'mentor_evaluating'::public.evaluation_status]));


--
-- Name: ledger_payment_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ledger_payment_idx ON public.escrow_ledger USING btree (payment_id, created_at);


--
-- Name: mentor_live_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mentor_live_idx ON public.mentor_profiles USING btree (category, rating_avg DESC) WHERE (status = 'live'::public.mentor_status);


--
-- Name: mentor_subject_paper_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mentor_subject_paper_idx ON public.mentor_subjects USING btree (paper, optional_subject_id);


--
-- Name: mentor_subject_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX mentor_subject_unique_idx ON public.mentor_subjects USING btree (mentor_id, paper, COALESCE(topic, ''::text), COALESCE((optional_subject_id)::integer, 0));


--
-- Name: notifications_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_user_idx ON public.notifications USING btree (user_id, created_at DESC);


--
-- Name: otp_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX otp_lookup_idx ON public.otp_verifications USING btree (destination, purpose) WHERE (consumed_at IS NULL);


--
-- Name: payments_mentor_payable_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payments_mentor_payable_idx ON public.payments USING btree (mentor_id) WHERE ((state = 'released'::public.payment_state) AND (payout_id IS NULL));


--
-- Name: payments_release_sweep_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payments_release_sweep_idx ON public.payments USING btree (release_at) WHERE (state = 'held_in_escrow'::public.payment_state);


--
-- Name: payouts_mentor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payouts_mentor_idx ON public.payouts USING btree (mentor_id, created_at DESC);


--
-- Name: retainer_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX retainer_active_idx ON public.retainer_contracts USING btree (student_id, mentor_id) WHERE (state = 'active'::public.retainer_state);


--
-- Name: retainer_expiry_sweep_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX retainer_expiry_sweep_idx ON public.retainer_contracts USING btree (valid_until) WHERE (state = 'active'::public.retainer_state);


--
-- Name: reviews_mentor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reviews_mentor_idx ON public.reviews USING btree (mentor_id, created_at DESC) WHERE is_public;


--
-- Name: services_discovery_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX services_discovery_idx ON public.services USING btree (type, price_paise) WHERE is_active;


--
-- Name: services_one_per_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX services_one_per_type_idx ON public.services USING btree (mentor_id, type) WHERE (type <> 'retainer'::public.service_type);


--
-- Name: v_mentor_cards _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.v_mentor_cards AS
 SELECT mp.user_id AS mentor_id,
    mp.display_name,
    mp.category,
    mp.profile_photo_id,
    mp.rating_avg,
    mp.rating_count,
    cr.has_final_rank,
    cr.mains_cleared_years,
    min(s.price_paise) FILTER (WHERE ((s.type = 'offline_evaluation'::public.service_type) AND s.is_active)) AS evaluation_from_paise,
    min(s.price_paise) FILTER (WHERE ((s.type = 'video_1on1'::public.service_type) AND s.is_active)) AS call_from_paise,
    array_agg(DISTINCT s.type) FILTER (WHERE s.is_active) AS active_service_types
   FROM ((public.mentor_profiles mp
     JOIN public.mentor_credentials cr ON ((cr.mentor_id = mp.user_id)))
     LEFT JOIN public.services s ON ((s.mentor_id = mp.user_id)))
  WHERE (mp.status = 'live'::public.mentor_status)
  GROUP BY mp.user_id, cr.has_final_rank, cr.mains_cleared_years;


--
-- Name: admin_audit_log admin_audit_log_admin_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_log
    ADD CONSTRAINT admin_audit_log_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: availability_blackouts availability_blackouts_mentor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_blackouts
    ADD CONSTRAINT availability_blackouts_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.mentor_profiles(user_id) ON DELETE CASCADE;


--
-- Name: availability_rules availability_rules_mentor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_rules
    ADD CONSTRAINT availability_rules_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.mentor_profiles(user_id) ON DELETE CASCADE;


--
-- Name: booking_status_history booking_status_history_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_status_history
    ADD CONSTRAINT booking_status_history_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id);


--
-- Name: booking_status_history booking_status_history_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_status_history
    ADD CONSTRAINT booking_status_history_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_mentor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.mentor_profiles(user_id) ON DELETE RESTRICT;


--
-- Name: bookings bookings_retainer_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_retainer_contract_id_fkey FOREIGN KEY (retainer_contract_id) REFERENCES public.retainer_contracts(id) ON DELETE RESTRICT;


--
-- Name: bookings bookings_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE RESTRICT;


--
-- Name: bookings bookings_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.student_profiles(user_id) ON DELETE RESTRICT;


--
-- Name: chat_messages chat_messages_attachment_doc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_attachment_doc_id_fkey FOREIGN KEY (attachment_doc_id) REFERENCES public.documents(id);


--
-- Name: chat_messages chat_messages_sender_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_sender_user_id_fkey FOREIGN KEY (sender_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: chat_messages chat_messages_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.chat_threads(id) ON DELETE CASCADE;


--
-- Name: chat_threads chat_threads_mentor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_threads
    ADD CONSTRAINT chat_threads_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.mentor_profiles(user_id) ON DELETE CASCADE;


--
-- Name: chat_threads chat_threads_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_threads
    ADD CONSTRAINT chat_threads_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.student_profiles(user_id) ON DELETE CASCADE;


--
-- Name: disputes disputes_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE RESTRICT;


--
-- Name: disputes disputes_raised_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_raised_by_fkey FOREIGN KEY (raised_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: disputes disputes_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id);


--
-- Name: documents documents_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: escrow_ledger escrow_ledger_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escrow_ledger
    ADD CONSTRAINT escrow_ledger_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE RESTRICT;


--
-- Name: escrow_ledger escrow_ledger_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escrow_ledger
    ADD CONSTRAINT escrow_ledger_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE RESTRICT;


--
-- Name: escrow_ledger escrow_ledger_payout_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escrow_ledger
    ADD CONSTRAINT escrow_ledger_payout_id_fkey FOREIGN KEY (payout_id) REFERENCES public.payouts(id) ON DELETE RESTRICT;


--
-- Name: escrow_ledger escrow_ledger_retainer_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escrow_ledger
    ADD CONSTRAINT escrow_ledger_retainer_contract_id_fkey FOREIGN KEY (retainer_contract_id) REFERENCES public.retainer_contracts(id) ON DELETE RESTRICT;


--
-- Name: evaluations evaluations_answer_doc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluations
    ADD CONSTRAINT evaluations_answer_doc_id_fkey FOREIGN KEY (answer_doc_id) REFERENCES public.documents(id);


--
-- Name: evaluations evaluations_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluations
    ADD CONSTRAINT evaluations_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: evaluations evaluations_checked_doc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluations
    ADD CONSTRAINT evaluations_checked_doc_id_fkey FOREIGN KEY (checked_doc_id) REFERENCES public.documents(id);


--
-- Name: mentor_agreements mentor_agreements_mentor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_agreements
    ADD CONSTRAINT mentor_agreements_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.mentor_profiles(user_id) ON DELETE CASCADE;


--
-- Name: mentor_credentials mentor_credentials_interview_admit_doc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_credentials
    ADD CONSTRAINT mentor_credentials_interview_admit_doc_id_fkey FOREIGN KEY (interview_admit_doc_id) REFERENCES public.documents(id);


--
-- Name: mentor_credentials mentor_credentials_mains_marksheet_doc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_credentials
    ADD CONSTRAINT mentor_credentials_mains_marksheet_doc_id_fkey FOREIGN KEY (mains_marksheet_doc_id) REFERENCES public.documents(id);


--
-- Name: mentor_credentials mentor_credentials_mentor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_credentials
    ADD CONSTRAINT mentor_credentials_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.mentor_profiles(user_id) ON DELETE CASCADE;


--
-- Name: mentor_credentials mentor_credentials_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_credentials
    ADD CONSTRAINT mentor_credentials_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id);


--
-- Name: mentor_daily_load mentor_daily_load_mentor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_daily_load
    ADD CONSTRAINT mentor_daily_load_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.mentor_profiles(user_id) ON DELETE CASCADE;


--
-- Name: mentor_kyc mentor_kyc_aadhaar_back_doc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_kyc
    ADD CONSTRAINT mentor_kyc_aadhaar_back_doc_id_fkey FOREIGN KEY (aadhaar_back_doc_id) REFERENCES public.documents(id);


--
-- Name: mentor_kyc mentor_kyc_aadhaar_front_doc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_kyc
    ADD CONSTRAINT mentor_kyc_aadhaar_front_doc_id_fkey FOREIGN KEY (aadhaar_front_doc_id) REFERENCES public.documents(id);


--
-- Name: mentor_kyc mentor_kyc_cheque_doc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_kyc
    ADD CONSTRAINT mentor_kyc_cheque_doc_id_fkey FOREIGN KEY (cheque_doc_id) REFERENCES public.documents(id);


--
-- Name: mentor_kyc mentor_kyc_mentor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_kyc
    ADD CONSTRAINT mentor_kyc_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.mentor_profiles(user_id) ON DELETE CASCADE;


--
-- Name: mentor_kyc mentor_kyc_pan_doc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_kyc
    ADD CONSTRAINT mentor_kyc_pan_doc_id_fkey FOREIGN KEY (pan_doc_id) REFERENCES public.documents(id);


--
-- Name: mentor_kyc mentor_kyc_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_kyc
    ADD CONSTRAINT mentor_kyc_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id);


--
-- Name: mentor_profiles mentor_profiles_intro_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_profiles
    ADD CONSTRAINT mentor_profiles_intro_video_id_fkey FOREIGN KEY (intro_video_id) REFERENCES public.documents(id);


--
-- Name: mentor_profiles mentor_profiles_profile_photo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_profiles
    ADD CONSTRAINT mentor_profiles_profile_photo_id_fkey FOREIGN KEY (profile_photo_id) REFERENCES public.documents(id);


--
-- Name: mentor_profiles mentor_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_profiles
    ADD CONSTRAINT mentor_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: mentor_profiles mentor_profiles_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_profiles
    ADD CONSTRAINT mentor_profiles_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id);


--
-- Name: mentor_subjects mentor_subjects_mentor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_subjects
    ADD CONSTRAINT mentor_subjects_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.mentor_profiles(user_id) ON DELETE CASCADE;


--
-- Name: mentor_subjects mentor_subjects_optional_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_subjects
    ADD CONSTRAINT mentor_subjects_optional_subject_id_fkey FOREIGN KEY (optional_subject_id) REFERENCES public.optional_subjects(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: otp_verifications otp_verifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otp_verifications
    ADD CONSTRAINT otp_verifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: payments payments_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE RESTRICT;


--
-- Name: payments payments_mentor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.mentor_profiles(user_id) ON DELETE RESTRICT;


--
-- Name: payments payments_payout_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_payout_id_fkey FOREIGN KEY (payout_id) REFERENCES public.payouts(id) ON DELETE SET NULL;


--
-- Name: payments payments_retainer_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_retainer_contract_id_fkey FOREIGN KEY (retainer_contract_id) REFERENCES public.retainer_contracts(id) ON DELETE RESTRICT;


--
-- Name: payments payments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.student_profiles(user_id) ON DELETE RESTRICT;


--
-- Name: payouts payouts_mentor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payouts
    ADD CONSTRAINT payouts_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.mentor_profiles(user_id) ON DELETE RESTRICT;


--
-- Name: retainer_contracts retainer_contracts_mentor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.retainer_contracts
    ADD CONSTRAINT retainer_contracts_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.mentor_profiles(user_id) ON DELETE RESTRICT;


--
-- Name: retainer_contracts retainer_contracts_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.retainer_contracts
    ADD CONSTRAINT retainer_contracts_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE RESTRICT;


--
-- Name: retainer_contracts retainer_contracts_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.retainer_contracts
    ADD CONSTRAINT retainer_contracts_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.student_profiles(user_id) ON DELETE RESTRICT;


--
-- Name: reviews reviews_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_mentor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.mentor_profiles(user_id) ON DELETE CASCADE;


--
-- Name: reviews reviews_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.student_profiles(user_id) ON DELETE CASCADE;


--
-- Name: services services_mentor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.mentor_profiles(user_id) ON DELETE CASCADE;


--
-- Name: session_recordings session_recordings_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_recordings
    ADD CONSTRAINT session_recordings_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: student_profiles student_profiles_optional_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_optional_subject_id_fkey FOREIGN KEY (optional_subject_id) REFERENCES public.optional_subjects(id);


--
-- Name: student_profiles student_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: admin_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: availability_blackouts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.availability_blackouts ENABLE ROW LEVEL SECURITY;

--
-- Name: availability_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: booking_status_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;

--
-- Name: bookings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_threads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;

--
-- Name: disputes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

--
-- Name: documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

--
-- Name: escrow_ledger; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.escrow_ledger ENABLE ROW LEVEL SECURITY;

--
-- Name: evaluations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

--
-- Name: mentor_agreements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mentor_agreements ENABLE ROW LEVEL SECURITY;

--
-- Name: mentor_credentials; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mentor_credentials ENABLE ROW LEVEL SECURITY;

--
-- Name: mentor_daily_load; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mentor_daily_load ENABLE ROW LEVEL SECURITY;

--
-- Name: mentor_kyc; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mentor_kyc ENABLE ROW LEVEL SECURITY;

--
-- Name: mentor_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mentor_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: mentor_subjects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mentor_subjects ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: optional_subjects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.optional_subjects ENABLE ROW LEVEL SECURITY;

--
-- Name: otp_verifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: payouts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

--
-- Name: retainer_contracts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.retainer_contracts ENABLE ROW LEVEL SECURITY;

--
-- Name: reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: services; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

--
-- Name: session_recordings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.session_recordings ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: student_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict yhHHLqWZAsa1aeoy94OJQUKigNIpDWexTTExwI0PzEEane3vGUrLkBQTDss7I2D

