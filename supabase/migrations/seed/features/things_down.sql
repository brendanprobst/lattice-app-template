-- Remove the demo Thing rows and nothing else.

delete from public.things where id in (1, 2, 3);

select id, name from public.things where id in (1, 2, 3) order by id;
