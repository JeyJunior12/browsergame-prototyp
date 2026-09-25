CREATE TRIGGER guard_banned_actor BEFORE INSERT OR DELETE OR UPDATE ON public.gang_members FOR EACH ROW EXECUTE FUNCTION block_banned_actor();
CREATE TRIGGER guard_banned_actor BEFORE INSERT OR DELETE OR UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION block_banned_actor();
CREATE TRIGGER guard_banned_actor BEFORE INSERT OR DELETE OR UPDATE ON public.user_pets FOR EACH ROW EXECUTE FUNCTION block_banned_actor();
CREATE TRIGGER guard_banned_actor BEFORE INSERT OR DELETE OR UPDATE ON public.fights FOR EACH ROW EXECUTE FUNCTION block_banned_actor();
CREATE TRIGGER guard_banned_actor BEFORE INSERT OR DELETE OR UPDATE ON public.daily_missions FOR EACH ROW EXECUTE FUNCTION block_banned_actor();
CREATE TRIGGER guard_banned_actor BEFORE INSERT OR DELETE OR UPDATE ON public.gangs FOR EACH ROW EXECUTE FUNCTION block_banned_actor();
CREATE TRIGGER guard_banned_actor BEFORE INSERT OR DELETE OR UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION block_banned_actor();
CREATE TRIGGER guard_banned_actor BEFORE INSERT OR DELETE OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION block_banned_actor();
CREATE TRIGGER profile_change_audit AFTER UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION audit_profile_change();
