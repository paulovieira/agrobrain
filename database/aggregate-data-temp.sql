delete from t_measurements


-- insert fake data
insert into t_measurements(mac, sid, type, val, ts)
values 

-- 1/set, around 12:00
('aa:bb', 1, 't', 20.0, '2016-09-01T12:00'),
('aa:bb', 1, 'h', 70.1, '2016-09-01T12:00'),
('aa:bb', 2, 't', 20.2, '2016-09-01T12:00'),
('aa:bb', 2, 'h', 70.3, '2016-09-01T12:00'),
('aa:cc', 1, 't', 20.4, '2016-09-01T12:03'),
('aa:cc', 2, 't', 20.5, '2016-09-01T12:03'),

-- 1/set, around 12:30
('aa:bb', 1, 't', 21.0, '2016-09-01T12:30'),
('aa:bb', 1, 'h', 71.1, '2016-09-01T12:30'),
('aa:bb', 2, 't', 21.2, '2016-09-01T12:30'),
('aa:bb', 2, 'h', 71.3, '2016-09-01T12:30'),
('aa:cc', 1, 't', 21.4, '2016-09-01T12:33'),
('aa:cc', 2, 't', 21.5, '2016-09-01T12:33'),

-- 1/set, around 13:00
('aa:bb', 1, 't', 22.0, '2016-09-01T13:00'),
('aa:bb', 1, 'h', 72.1, '2016-09-01T13:00'),
('aa:bb', 2, 't', 22.2, '2016-09-01T13:00'),
('aa:bb', 2, 'h', 72.3, '2016-09-01T13:00'),
('aa:cc', 1, 't', 22.4, '2016-09-01T13:03'),
('aa:cc', 2, 't', 22.5, '2016-09-01T13:03'),

-- 1/set, around 13:30
('aa:bb', 1, 't', 23.0, '2016-09-01T13:30'),
('aa:bb', 1, 'h', 73.1, '2016-09-01T13:30'),
('aa:bb', 2, 't', 23.2, '2016-09-01T13:30'),
('aa:bb', 2, 'h', 73.3, '2016-09-01T13:30'),
('aa:cc', 1, 't', 23.4, '2016-09-01T13:33'),
('aa:cc', 2, 't', 23.5, '2016-09-01T13:33'),

-- 2/set, around 12:00
('aa:bb', 1, 't', 24.0, '2016-09-02T12:00'),
('aa:bb', 1, 'h', 74.1, '2016-09-02T12:00'),
('aa:bb', 2, 't', 24.2, '2016-09-02T12:00'),
('aa:bb', 2, 'h', 74.3, '2016-09-02T12:00'),
('aa:cc', 1, 't', 24.4, '2016-09-02T12:03'),
('aa:cc', 2, 't', 24.5, '2016-09-02T12:03'),

-- 2/set, around 12:30
('aa:bb', 1, 't', 25.0, '2016-09-02T12:30'),
('aa:bb', 1, 'h', 75.1, '2016-09-02T12:30'),
('aa:bb', 2, 't', 25.2, '2016-09-02T12:30'),
('aa:bb', 2, 'h', 75.3, '2016-09-02T12:30'),
('aa:cc', 1, 't', 25.4, '2016-09-02T12:33'),
('aa:cc', 2, 't', 25.5, '2016-09-02T12:33'),

-- 2/set, around 13:00
('aa:bb', 1, 't', 26.0, '2016-09-02T13:00'),
('aa:bb', 1, 'h', 76.1, '2016-09-02T13:00'),
('aa:bb', 2, 't', 26.2, '2016-09-02T13:00'),
('aa:bb', 2, 'h', 76.3, '2016-09-02T13:00'),
('aa:cc', 1, 't', 26.4, '2016-09-02T13:03'),
('aa:cc', 2, 't', 26.5, '2016-09-02T13:03'),

-- 2/set, around 13:30
('aa:bb', 1, 't', 27.0, '2016-09-02T13:30'),
('aa:bb', 1, 'h', 77.1, '2016-09-02T13:30'),
('aa:bb', 2, 't', 27.2, '2016-09-02T13:30'),
('aa:bb', 2, 'h', 77.3, '2016-09-02T13:30'),
('aa:cc', 1, 't', 27.4, '2016-09-02T13:33'),
('aa:cc', 2, 't', 27.5, '2016-09-02T13:33'),

-- 2/set, around 13:50 (invalid values)
('aa:bb', 1, 't', -11, '2016-09-02T13:50'),
('aa:bb', 1, 'h', -2, '2016-09-02T13:50'),
('aa:bb', 2, 't', 65, '2016-09-02T13:50'),
('aa:bb', 2, 'h', 111, '2016-09-02T13:50'),
('aa:cc', 1, 't', -10, '2016-09-02T13:53'),
('aa:cc', 2, 't', 80, '2016-09-02T13:53')



-- select with conditional where 
select * 
from t_measurements
where
	-- filter outliers (depends on the nature of the measurement)
	val > (case 
		when type = 't' then -10
		when type = 'h' then -1
		else -99999
		end)
	and 
	val < (case 
		when type = 't' then 70
		when type = 'h' then 101
		else 99999
		end)		
order by ts



-- aggregated select by time interval (based in the above query)
select 
	date_trunc('hour', ts) as time, 
	mac, 
	sid, 
	type, 
	round(avg(val)::numeric, 2) as val_avg,
	round(stddev_pop(val)::numeric, 2) as val_stddev,
	count(val)::smallint as val_count
from t_measurements

where
	val > (case 
		when type = 't' then -10
		when type = 'h' then -1
		else -99999
		end)
	and 
	val < (case 
		when type = 't' then 60
		when type = 'h' then 101
		else 99999
		end)	
		
group by time, mac, sid, type
order by time



-- final query - aggregate by time and gather the results using json_agg
with agg_by_time as (

	select 
		date_trunc('hour', ts) as time, 
		mac, 
		sid, 
		type, 
		round(avg(val)::numeric, 2) as val_avg,
		round(stddev_pop(val)::numeric, 2) as val_stddev,
		count(val)::smallint as val_count
	from t_measurements

	where
		val > (case 
			when type = 't' then -10
			when type = 'h' then -1
			else -99999
			end)
		and 
		val < (case 
			when type = 't' then 60
			when type = 'h' then 101
			else 99999
			end)	
			
	group by time, mac, sid, type
	order by time
)
select 
	time, 
	json_agg(
		-- key is formed dynamically using the combination of (mac, sid, type) (which identifies uniquely the location of the measurement)
		json_build_object(
			'key', mac || '_' || sid || '_' || type, 
			'val_avg', val_avg, 
			'val_stddev', val_stddev, 
			'val_count', val_count
		)
	) 
from agg_by_time
group by time
order by time
