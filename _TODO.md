Does it makes sense to  aggregate the data in the local server?

What is the advantage? Why aren't doing the aggregation only in the cloud server? 

We might want to look at the aggregation in different ways. It depends on several parameters:

- start-time
- end-time
- aggregation-interval (1 hour, 1 day, ...)
- variables/sensors to use

So it makes sense to execute the aggregation in the cloud only.

However if we want to have a mirror of aggregated data in a google sheet it makes sense to have a default (fixed) set of parameters, so that we know which data has already been sent to the sheet.


